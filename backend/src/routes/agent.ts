import { Router, Request, Response, NextFunction } from "express";
import { AgentLog, Conversation, Message, forStore } from "../models";
import {
  authenticate,
  injectTenant,
  requireRole,
  validate,
  agentRateLimiter,
} from "../middlewares";
import { retrieveContext } from "../services/rag";
import {
  streamChat,
  buildSystemPrompt,
  getLlmClient,
  LLM_MODEL,
  MAX_TOKENS_PER_TURN,
  type LLMMessage,
} from "../services/llm";
import {
  AGENT_TOOLS,
  executeToolCall,
  canCallAnotherTool,
  validateToolCall,
  type ToolExecutionContext,
} from "../services/agentTools";
import {
  hasPendingConfirmation,
  executeConfirmedAction,
  getPendingConfirmation,
  isAffirmativeConfirmation,
} from "../services/orderConfirmation";
import {
  checkPromptInjection,
  checkProhibitedIntent,
  sanitizeContextData,
  moderateAgentOutput,
  STANDARD_REFUSALS,
} from "../services/guardrails";
import { z } from "zod";
import { Op } from "sequelize";
import { sanitizeForLogging } from "../middlewares/sanitizeLogs";
import AgentLogRecord from "../models/AgentLog";

const agentRouter = Router();

agentRouter.use(authenticate, injectTenant);

const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.coerce.number().int().positive().optional(),
});

const logDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Date must be a valid calendar date");

const agentLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  conversationId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  fromDate: logDateSchema.optional(),
  toDate: logDateSchema.optional(),
  disposition: z.enum(["refused", "blocked"]).optional(),
  action: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["success", "error"]).optional(),
});

// ─── POST /api/agent/chat ─────────────────────────────────────────────────────
/**
 * ShopMate AI chat endpoint.
 *
 * Supports two response modes driven by the Accept header:
 *   - text/event-stream  → SSE (real-time streaming, token by token)
 *   - application/json   → single JSON response (Postman / testing)
 *
 * Agentic pipeline per turn:
 *   1.  Get / create Conversation
 *   2.  Persist user Message
 *   2.5 Short-circuit: if "Oui" + pending confirmation → execute + respond
 *   3.  Retrieve RAG context (storeId-scoped, never cross-tenant)
 *   4.  Build message history: system prompt + history + RAG context + user message
 *   5.  Tool loop: LLM → tool_call → execute → LLM (max MAX_TOOL_CALLS_PER_TURN)
 *   6.  Stream final answer token by token
 *   7.  Persist assistant Message + AgentLog audit entry
 *
 * SSE event types emitted:
 *   { type: "start",        conversationId }
 *   { type: "source",       sources: [{name, score}] }
 *   { type: "tool_call",    tool, args }
 *   { type: "tool_result",  tool, result }
 *   { type: "token",        token }
 *   { type: "confirmation", confirmed, orderId? }
 *   { type: "done",         conversationId, messageId, ragUsed, sourcesUsed, toolsUsed }
 *   { type: "error",        message }
 */
agentRouter.post(
  "/chat",
  agentRateLimiter,
  validate(chatMessageSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    const storeId = req.storeId as number;
    const user = req.user!;
    const { message: userText, conversationId } = req.body as {
      message: string;
      conversationId?: number;
    };

    const isSSE = (req.headers.accept ?? "").includes("text/event-stream");
    const turnStartedAt = Date.now();
    const toolsCalled: Array<Record<string, unknown>> = [];
    let ragSources: Array<{ name: string; score: number }> = [];
    let tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;
    let refusalCategory: string | null = null;
    let traceMessageId: number | null = null;
    let conversation: Conversation | null = null;

    const logText = (value: unknown): string => {
      const sanitized = sanitizeForLogging(value);
      return typeof sanitized === "string" ? sanitized : JSON.stringify(sanitized);
    };
    const recordTurn = async (entry: {
      action: string;
      status: "success" | "error";
      output?: unknown;
      errorMessage?: unknown;
    }): Promise<void> => {
      await AgentLog.create({
        storeId,
        agentName: logText(process.env.LLM_MODEL ?? LLM_MODEL),
        action: entry.action,
        status: entry.status,
        conversationId: conversation?.id ?? null,
        messageId: traceMessageId,
        input: logText(userText).slice(0, 4000),
        output: entry.output === undefined ? null : logText(entry.output).slice(0, 4000),
        errorMessage: entry.errorMessage === undefined ? null : logText(entry.errorMessage).slice(0, 2000),
        toolsCalled: sanitizeForLogging(toolsCalled) as Array<Record<string, unknown>>,
        ragSources: sanitizeForLogging(ragSources) as Array<Record<string, unknown>>,
        tokenUsage,
        latencyMs: Date.now() - turnStartedAt,
        refusalCategory,
      });
    };
    const addTokenUsage = (usage: { promptTokens: number; completionTokens: number; totalTokens: number }): void => {
      tokenUsage = {
        promptTokens: (tokenUsage?.promptTokens ?? 0) + usage.promptTokens,
        completionTokens: (tokenUsage?.completionTokens ?? 0) + usage.completionTokens,
        totalTokens: (tokenUsage?.totalTokens ?? 0) + usage.totalTokens,
      };
    };

    // ── Client disconnect guard ───────────────────────────────────────────────
    const abortController = new AbortController();
    let clientConnected = true;
    req.on("close", () => {
      clientConnected = false;
      abortController.abort();
    });

    /** Write a JSON SSE event only when client is still connected. */
    const safeSend = (data: object): void => {
      if (isSSE && clientConnected && !res.writableEnded) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    try {
      // ── 1. Get or create Conversation ────────────────────────────────────────
      if (conversationId) {
        conversation = (await forStore(Conversation, storeId).findOne({
          where: { id: conversationId, userId: user.userId },
        })) as Conversation | null;
      }
      if (!conversation) {
        conversation = await Conversation.create({
          storeId,
          userId: user.userId,
          title: userText.slice(0, 40),
          status: "active",
        });
      }

      // ── 2. Persist user Message & bump conversation timestamp ────────────────
      const userMessage = await Message.create({
        storeId,
        conversationId: conversation.id,
        role: "user",
        content: userText,
      });
      await conversation.update({ updatedAt: new Date() });

      // ── 2.6 Guardrails: Prompt Injection Detection & Systematic Refusals ─────
      const activeUserText = userText;
      const injectionCheck = checkPromptInjection(userText);
      if (injectionCheck.isSuspicious) {
        // Keep the original in the audit log, but never replay hostile text as
        // trusted conversation history on the next turn.
        await userMessage.update({
          content: "[Message masqué : tentative de contournement des règles détectée.]",
        });
        refusalCategory = "prompt_injection";
        const replyMessage = STANDARD_REFUSALS.promptInjection;
        const assistantMsg = await Message.create({
          storeId,
          conversationId: conversation.id,
          role: "assistant",
          content: replyMessage,
        });
        traceMessageId = assistantMsg.id;
        await recordTurn({ action: "prompt_injection_flagged", status: "error", output: replyMessage });
        if (isSSE) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-Accel-Buffering", "no");
          res.flushHeaders();
          safeSend({ type: "start", conversationId: conversation.id });
          safeSend({ type: "token", token: replyMessage });
          safeSend({ type: "done", conversationId: conversation.id, messageId: assistantMsg.id, ragUsed: false, sourcesUsed: [], toolsUsed: [] });
          return res.end();
        }
        return res.json({ conversationId: conversation.id, messageId: assistantMsg.id, response: replyMessage, ragUsed: false, sourcesUsed: [], toolsUsed: [] });
      }

      // Systematic refusals (discount negotiations, refunds, cross-tenant data, medical/legal)
      const refusalCheck = checkProhibitedIntent(userText);
      if (refusalCheck.shouldRefuse && refusalCheck.refusalMessage) {
        refusalCategory = refusalCheck.category ?? "prohibited_request";
        const replyMessage = refusalCheck.refusalMessage;

        const assistantMsg = await Message.create({
          storeId,
          conversationId: conversation.id,
          role: "assistant",
          content: replyMessage,
        });

        traceMessageId = assistantMsg.id;
        await recordTurn({ action: `refusal_${refusalCheck.category}`, status: "success", output: replyMessage });

        if (isSSE) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-Accel-Buffering", "no");
          res.flushHeaders();
          safeSend({ type: "start", conversationId: conversation.id });
          safeSend({ type: "token", token: replyMessage });
          safeSend({
            type: "done",
            conversationId: conversation.id,
            messageId: assistantMsg.id,
            ragUsed: false,
            sourcesUsed: [],
            toolsUsed: [],
          });
          return res.end();
        }

        return res.json({
          conversationId: conversation.id,
          messageId: assistantMsg.id,
          response: replyMessage,
          ragUsed: false,
          sourcesUsed: [],
          toolsUsed: [],
        });
      }

      // A prohibited or adversarial message must never confirm an earlier write.
      if (isAffirmativeConfirmation(userText) && hasPendingConfirmation(conversation.id)) {
        const pendingAction = getPendingConfirmation(conversation.id);
        if (pendingAction) {
          toolsCalled.push({
            name: pendingAction.action,
            args: sanitizeForLogging(pendingAction.args),
            validationPassed: true,
            source: "explicit_customer_confirmation",
          });
        }
        const executionResult = await executeConfirmedAction(conversation.id, {
          storeId,
          userId: user.userId,
          email: user.email,
          conversationId: conversation.id,
        });
        const replyMessage = executionResult.message || (executionResult.success
          ? "✅ Votre commande a été validée avec succès !"
          : `❌ ${executionResult.error}`);
        const assistantMsg = await Message.create({
          storeId,
          conversationId: conversation.id,
          role: "assistant",
          content: replyMessage,
        });
        traceMessageId = assistantMsg.id;
        await recordTurn({ action: "order_confirmation", status: executionResult.success ? "success" : "error", output: replyMessage });
        if (isSSE) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-Accel-Buffering", "no");
          res.flushHeaders();
          safeSend({ type: "start", conversationId: conversation.id });
          safeSend({ type: "confirmation", confirmed: executionResult.success, orderId: executionResult.orderId });
          safeSend({ type: "token", token: replyMessage });
          safeSend({ type: "done", conversationId: conversation.id, messageId: assistantMsg.id, orderConfirmed: true, orderId: executionResult.orderId });
          return res.end();
        }
        return res.json({ conversationId: conversation.id, messageId: assistantMsg.id, response: replyMessage, orderConfirmed: true, orderId: executionResult.orderId });
      }

      // ── 3. RAG context (storeId-scoped, injected as data not instructions) ────
      const retrievedChunks = await retrieveContext(activeUserText, storeId);
      const ragChunks = retrievedChunks.filter((chunk) => {
        const suspicious = checkPromptInjection(`${chunk.source}\n${chunk.content}`).isSuspicious;
        return !suspicious;
      });
      ragSources = retrievedChunks.map((chunk) => ({
        name: chunk.source,
        score: Number(chunk.score),
        omitted: !ragChunks.some((safeChunk) => safeChunk.chunkId === chunk.chunkId),
      }));

      // ── 4. Build initial message history ─────────────────────────────────────
      const history = await Message.findAll({
        where: { conversationId: conversation.id },
        order: [["createdAt", "ASC"]],
        limit: 10,
        attributes: ["role", "content"],
      });

      const initialMessages: LLMMessage[] = [
        // 1. System prompt: role, language, guardrails, refusal rules
        { role: "system", content: buildSystemPrompt("ShopMate") },
        // 2. Conversation history (all turns except the just-added user message)
        ...history.slice(0, -1).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        // 3. RAG context — injected as DATA, never as instructions (prompt injection guard)
        ...(ragChunks.length > 0
          ? [{
            role: "system" as const,
            content:
              `<context>\n` +
              ragChunks
                .map((c) => `[${sanitizeContextData(c.source)}] (similarité: ${(c.score * 100).toFixed(0)}%)\n${sanitizeContextData(c.content)}`)
                .join("\n\n---\n\n") +
              `\n</context>`,
          }]
          : [{
            role: "system" as const,
            content: `<context>\nAucun document pertinent trouvé dans la base documentaire pour cette requête (similarité sous le seuil).\n</context>`,
          }]),
        // 4. Latest user message
        { role: "user", content: activeUserText },
      ];

      // ── 5. Tool execution context (storeId + userId ALWAYS from JWT) ──────────
      const toolContext: ToolExecutionContext = {
        storeId,
        userId: user.userId,
        email: user.email,
        conversationId: conversation.id,
      };

      // ── 6. SSE mode ───────────────────────────────────────────────────────────
      if (isSSE) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        safeSend({ type: "start", conversationId: conversation.id });

        // Emit source event immediately so the client knows what docs were used
        if (ragChunks.length > 0) {
          safeSend({
            type: "source",
            sources: ragChunks.map((c) => ({
              name: c.source,
              score: parseFloat((c.score * 100).toFixed(1)),
            })),
          });
        }

        // ── Agentic tool loop state ─────────────────────────────────────────────
        let toolCallCount = 0;
        const allToolsUsed: string[] = [];
        let currentMessages: LLMMessage[] = [...initialMessages];
        let toolCallsDetectedThisTurn = false;
        let fullResponse = "";

        /**
         * One recursive streaming call.
         * - If the LLM responds with tool calls: onToolCalls executes them,
         *   updates currentMessages, then onDone calls runStreamTurn() again.
         * - If the LLM responds with text: onDone persists and closes the stream.
         */
        const runStreamTurn = async (): Promise<void> => {
          toolCallsDetectedThisTurn = false;

          await streamChat(
            currentMessages,
            canCallAnotherTool(toolCallCount) ? AGENT_TOOLS : undefined,
            {
              onToken: (token) => {
                // Filter internal tool-call chunk markers — not meant for the client
                if (!token.startsWith("\n__TOOL_CALL__:")) {
                  // Buffer until the complete answer passes output moderation.
                  fullResponse += token;
                }
              },
              onUsage: addTokenUsage,

              // ── Tool call interception ─────────────────────────────────────────
              onToolCalls: async (toolCalls) => {
                toolCallsDetectedThisTurn = true;

                // Append the assistant's tool-call message to history
                currentMessages.push({
                  role: "assistant",
                  content: null,
                  tool_calls: toolCalls,
                } as any);

                // Execute each tool (Zod-validated, storeId from JWT — never from model)
                for (const tc of toolCalls) {
                  if (!canCallAnotherTool(toolCallCount)) break;

                  const toolName = tc.function.name;
                  let parsedArgs: any = {};
                  try { parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}; } catch { }

                  // Emit tool_call event BEFORE execution so client can show "thinking…"
                  safeSend({ type: "tool_call", tool: toolName, args: parsedArgs });

                  const validation = validateToolCall(toolName, tc.function.arguments, toolContext);
                  const result = await executeToolCall(toolName, tc.function.arguments, toolContext);
                  toolsCalled.push({
                    name: toolName,
                    args: validation.success ? sanitizeForLogging(validation.args) : null,
                    validationPassed: validation.success,
                    ...(validation.success ? {} : { validationError: validation.error }),
                  });
                  allToolsUsed.push(toolName);
                  toolCallCount++;

                  // Emit tool_result event — treated as data by client, not instructions
                  safeSend({ type: "tool_result", tool: toolName, result });

                  // Append tool result to messages — LLM will summarise it next turn (sanitized as data)
                  currentMessages.push({
                    role: "tool",
                    tool_call_id: tc.id,
                    content: sanitizeContextData(JSON.stringify(result)),
                  } as any);
                }
              },

              // ── Turn done ──────────────────────────────────────────────────────
              onDone: async (text) => {
                if (toolCallsDetectedThisTurn && canCallAnotherTool(toolCallCount)) {
                  // Tools were called this turn → run another LLM turn with results
                  await runStreamTurn();
                  return;
                }

                // Final text answer (or max tool calls reached)
                fullResponse = text || fullResponse;

                // Output moderation pass (detect prompt leaks, unauthorized discounts)
                const moderation = moderateAgentOutput(fullResponse);
                if (!moderation.passed) {
                  fullResponse = moderation.sanitizedOutput;
                  refusalCategory = "output_moderation";
                }

                // Enforce the RAG abstention in code as well as in the prompt.
                // Live DB tools remain valid sources for stock, price, and order actions.
                if (ragChunks.length === 0 && allToolsUsed.length === 0) {
                  fullResponse = "Je n'ai pas cette information.";
                  refusalCategory = "no_rag_context";
                }

                if (!clientConnected) return; // client disconnected mid-stream

                safeSend({ type: "token", token: fullResponse });

                const assistantMsg = await Message.create({
                  storeId,
                  conversationId: conversation!.id,
                  role: "assistant",
                  content: fullResponse,
                });
                traceMessageId = assistantMsg.id;

                await recordTurn({ action: "chat_turn", status: "success", output: fullResponse });

                safeSend({
                  type: "done",
                  conversationId: conversation!.id,
                  messageId: assistantMsg.id,
                  ragUsed: ragChunks.length > 0,
                  sourcesUsed: ragChunks.map((c) => c.source),
                  toolsUsed: allToolsUsed,
                });
                if (!res.writableEnded) res.end();
              },

              onError: async (err) => {
                await recordTurn({ action: "chat_turn", status: "error", errorMessage: err.message });
                safeSend({ type: "error", message: "Une erreur est survenue. Réessayez." });
                if (!res.writableEnded) res.end();
              },
            },
            abortController.signal
          );
        };

        await runStreamTurn();
        return;
      }

      // ── 7. JSON mode (Postman / testing) ─────────────────────────────────────
      //    Non-streaming tool loop: run until no tool calls or max reached.
      const allToolsUsed: string[] = [];
      let toolCallCount = 0;
      let currentMessages: LLMMessage[] = [...initialMessages];

      while (canCallAnotherTool(toolCallCount)) {
        const client = getLlmClient();
        const model = process.env.LLM_MODEL ?? LLM_MODEL;

        const response = await client.chat.completions.create({
          model,
          messages: currentMessages as any,
          tools: canCallAnotherTool(toolCallCount) ? (AGENT_TOOLS as any) : undefined,
          tool_choice: "auto",
          stream: false,
          max_tokens: MAX_TOKENS_PER_TURN,
          temperature: 0.3,
        });

        if (response.usage) {
          addTokenUsage({
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          });
        }

        const choice = response.choices[0];
        if (!choice) break;

        // No tool calls → we have the final text answer
        if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
          currentMessages.push({ role: "assistant", content: choice.message.content ?? "" });
          break;
        }

        // Append assistant message with tool calls
        currentMessages.push({
          role: "assistant",
          content: choice.message.content ?? null,
          tool_calls: choice.message.tool_calls,
        } as any);

        // Execute each tool call (Zod + allowlist, storeId from JWT)
        for (const tc of choice.message.tool_calls) {
          if (!canCallAnotherTool(toolCallCount)) break;
          if (tc.type !== "function") continue;
          const validation = validateToolCall(tc.function.name, tc.function.arguments, toolContext);
          const result = await executeToolCall(tc.function.name, tc.function.arguments, toolContext);
          toolsCalled.push({
            name: tc.function.name,
            args: validation.success ? sanitizeForLogging(validation.args) : null,
            validationPassed: validation.success,
            ...(validation.success ? {} : { validationError: validation.error }),
          });
          allToolsUsed.push(tc.function.name);
          toolCallCount++;
          currentMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: sanitizeContextData(JSON.stringify(result)),
          } as any);
        }
      }

      // Final answer is the last assistant message in the loop
      const lastMsg = currentMessages[currentMessages.length - 1];
      let finalResponse =
        lastMsg.role === "assistant" && lastMsg.content
          ? (lastMsg.content as string)
          : "";

      // Output moderation pass (detect prompt leaks, unauthorized discounts)
      const moderation = moderateAgentOutput(finalResponse);
      if (!moderation.passed) {
        finalResponse = moderation.sanitizedOutput;
        refusalCategory = "output_moderation";
      }

      if (ragChunks.length === 0 && allToolsUsed.length === 0) {
        finalResponse = "Je n'ai pas cette information.";
        refusalCategory = "no_rag_context";
      }

      const assistantMsg = await Message.create({
        storeId,
        conversationId: conversation.id,
        role: "assistant",
        content: finalResponse,
      });
      traceMessageId = assistantMsg.id;

      await recordTurn({ action: "chat_turn", status: "success", output: finalResponse });

      return res.json({
        conversationId: conversation.id,
        messageId: assistantMsg.id,
        response: finalResponse,
        ragUsed: ragChunks.length > 0,
        sourcesUsed: ragChunks.map((c) => c.source),
        toolsUsed: allToolsUsed,
      });

    } catch (err) {
      try {
        await recordTurn({ action: "chat_turn", status: "error", errorMessage: err instanceof Error ? err.message : String(err) });
      } catch { /* ignore secondary log failure */ }

      if (isSSE && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: "error", message: "Erreur interne." })}\n\n`);
        return res.end();
      }
      next(err);
    }
  }
);

// ─── GET /api/agent/conversations ─────────────────────────────────────────────
/**
 * List conversation history for the current authenticated user.
 * Returns conversations ordered by most recent, each with its messages.
 */
agentRouter.get(
  "/conversations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const user = req.user!;

      const conversations = await forStore(Conversation, storeId).findAll({
        where: { userId: user.userId },
        include: [{
          association: "messages",
          attributes: ["id", "role", "content", "createdAt"],
        }],
        order: [
          ["updatedAt", "DESC"],
          [{ model: Message, as: "messages" }, "createdAt", "ASC"],
        ],
      });

      return res.json({ conversations });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/agent/conversations/:id ─────────────────────────────────────────
/**
 * Get a single conversation and its full history for the current user.
 */
agentRouter.get(
  "/conversations/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const user = req.user!;
      const convId = Number(req.params.id);

      const conversation = await forStore(Conversation, storeId).findOne({
        where: { id: convId, userId: user.userId },
        include: [{
          association: "messages",
          attributes: ["id", "role", "content", "createdAt"],
        }],
        order: [[{ model: Message, as: "messages" }, "createdAt", "ASC"]],
      });

      if (!conversation) {
        return res.status(404).json({ error: "Conversation introuvable" });
      }

      return res.json({ conversation });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/agent/logs ──────────────────────────────────────────────────────
/**
 * Paginated, store-scoped audit traces for AI interactions (ADMIN only).
 */
agentRouter.get(
  "/logs",
  requireRole("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = agentLogsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid log filters",
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const storeId = req.storeId as number;
      const { page, limit, conversationId, customerId, fromDate, toDate, disposition, action, status } = parsed.data;
      const where: Record<PropertyKey, unknown> = {};
      if (conversationId !== undefined) where.conversationId = conversationId;
      if (action) where.action = action;
      if (status) where.status = status;
      if (customerId !== undefined) {
        const customerConversations = (await forStore(Conversation, storeId).findAll({
          where: { userId: customerId },
          attributes: ["id"],
          raw: true,
        })) as unknown as Array<{ id: number }>;
        where.conversationId = { [Op.in]: customerConversations.map(({ id }) => id) };
      }
      if (fromDate || toDate) {
        const createdAt: Record<PropertyKey, Date> = {};
        if (fromDate) createdAt[Op.gte] = new Date(`${fromDate}T00:00:00.000Z`);
        if (toDate) {
          const exclusiveEnd = new Date(`${toDate}T00:00:00.000Z`);
          exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
          createdAt[Op.lt] = exclusiveEnd;
        }
        where.createdAt = createdAt;
      }
      if (disposition === "blocked") {
        where.refusalCategory = { [Op.in]: ["prompt_injection", "output_moderation"] };
      } else if (disposition === "refused") {
        where.refusalCategory = {
          [Op.ne]: null,
          [Op.notIn]: ["prompt_injection", "output_moderation"],
        };
      }

      const { rows: rawLogs, count: total } = await forStore(AgentLog, storeId).findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset: (page - 1) * limit,
      });
      const logs = rawLogs as AgentLogRecord[];
      const conversationIds = Array.from(
        new Set(logs.map((log) => log.conversationId).filter((id): id is number => id !== null))
      );
      const conversations = conversationIds.length
        ? await forStore(Conversation, storeId).findAll({
            where: { id: { [Op.in]: conversationIds } },
            attributes: ["id", "userId"],
            include: [{ association: "user", attributes: ["id", "name", "email"], where: { storeId }, required: true }],
          })
        : [];
      const customersByConversation = new Map(
        conversations.map((row) => {
          const conversation = row as Conversation;
          const relatedUser = (row as Conversation & { user?: { id: number; name: string; email: string } }).user;
          return [conversation.id, relatedUser ? { id: relatedUser.id, name: relatedUser.name, email: relatedUser.email } : null] as const;
        })
      );
      return res.json({
        logs: logs.map((log) => ({
          ...log.toJSON(),
          customer: log.conversationId ? customersByConversation.get(log.conversationId) ?? null : null,
        })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/agent/logs/:id ──────────────────────────────────────────────────
/** Return the full audit trace for one turn, restricted to the current store. */
agentRouter.get(
  "/logs/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const logId = Number(req.params.id);
      if (!Number.isSafeInteger(logId) || logId < 1) {
        return res.status(400).json({ error: "Invalid log ID" });
      }
      const log = (await forStore(AgentLog, storeId).findOne({ where: { id: logId } })) as AgentLogRecord | null;
      if (!log) return res.status(404).json({ error: "Agent log not found" });

      let customer = null;
      if (log.conversationId) {
        const conversation = await forStore(Conversation, storeId).findOne({
          where: { id: log.conversationId },
          attributes: ["id", "userId"],
          include: [{ association: "user", attributes: ["id", "name", "email"], where: { storeId }, required: true }],
        });
        const relatedUser = (conversation as (Conversation & { user?: { id: number; name: string; email: string } }) | null)?.user;
        if (relatedUser) customer = { id: relatedUser.id, name: relatedUser.name, email: relatedUser.email };
      }
      return res.json({ log, customer });
    } catch (err) {
      next(err);
    }
  }
);

export default agentRouter;
