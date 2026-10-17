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
  type LLMMessage,
} from "../services/llm";
import {
  AGENT_TOOLS,
  executeToolCall,
  MAX_TOOL_CALLS_PER_TURN,
  type ToolExecutionContext,
} from "../services/agentTools";
import {
  hasPendingConfirmation,
  executeConfirmedAction,
  isAffirmativeConfirmation,
} from "../services/orderConfirmation";
import { z } from "zod";

const agentRouter = Router();

agentRouter.use(authenticate, injectTenant);

const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.coerce.number().int().positive().optional(),
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
    const storeId   = req.storeId as number;
    const user      = req.user!;
    const { message: userText, conversationId } = req.body as {
      message: string;
      conversationId?: number;
    };

    const isSSE = (req.headers.accept ?? "").includes("text/event-stream");

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
      let conversation: Conversation | null = null;
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

      // ── 2. Persist user Message ───────────────────────────────────────────────
      await Message.create({
        storeId,
        conversationId: conversation.id,
        role: "user",
        content: userText,
      });

      // ── 2.5 Explicit Confirmation Check ("Oui" → execute pending action) ──────
      if (isAffirmativeConfirmation(userText) && hasPendingConfirmation(conversation.id)) {
        const executionResult = await executeConfirmedAction(conversation.id, {
          storeId,
          userId: user.userId,
          email: user.email,
          conversationId: conversation.id,
        });

        const replyMessage =
          executionResult.message ||
          (executionResult.success
            ? "✅ Votre commande a été validée avec succès !"
            : `❌ ${executionResult.error}`);

        const assistantMsg = await Message.create({
          storeId,
          conversationId: conversation.id,
          role: "assistant",
          content: replyMessage,
        });

        await AgentLog.create({
          storeId,
          agentName: process.env.LLM_MODEL ?? LLM_MODEL,
          action: "order_confirmation",
          status: executionResult.success ? "success" : "error",
          input: userText.slice(0, 500),
          output: replyMessage.slice(0, 500),
        });

        if (isSSE) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-Accel-Buffering", "no");
          res.flushHeaders();
          safeSend({ type: "start", conversationId: conversation.id });
          safeSend({ type: "confirmation", confirmed: executionResult.success, orderId: executionResult.orderId });
          safeSend({ type: "token", token: replyMessage });
          safeSend({
            type: "done",
            conversationId: conversation.id,
            messageId: assistantMsg.id,
            orderConfirmed: true,
            orderId: executionResult.orderId,
          });
          return res.end();
        }
        return res.json({
          conversationId: conversation.id,
          messageId: assistantMsg.id,
          response: replyMessage,
          orderConfirmed: true,
          orderId: executionResult.orderId,
        });
      }

      // ── 3. RAG context (storeId-scoped, injected as data not instructions) ────
      const ragChunks = await retrieveContext(userText, storeId);

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
                  .map((c) => `[${c.source}] (similarité: ${(c.score * 100).toFixed(0)}%)\n${c.content}`)
                  .join("\n\n---\n\n") +
                `\n</context>`,
            }]
          : []),
        // 4. Latest user message
        { role: "user", content: userText },
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
        let toolCallCount  = 0;
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
            toolCallCount < MAX_TOOL_CALLS_PER_TURN ? AGENT_TOOLS : undefined,
            {
              onToken: (token) => {
                // Filter internal tool-call chunk markers — not meant for the client
                if (!token.startsWith("\n__TOOL_CALL__:")) {
                  safeSend({ type: "token", token });
                  fullResponse += token;
                }
              },

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
                  if (toolCallCount >= MAX_TOOL_CALLS_PER_TURN) break;

                  const toolName = tc.function.name;
                  let parsedArgs: any = {};
                  try { parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}; } catch {}

                  // Emit tool_call event BEFORE execution so client can show "thinking…"
                  safeSend({ type: "tool_call", tool: toolName, args: parsedArgs });

                  const result = await executeToolCall(toolName, tc.function.arguments, toolContext);
                  allToolsUsed.push(toolName);
                  toolCallCount++;

                  // Emit tool_result event — treated as data by client, not instructions
                  safeSend({ type: "tool_result", tool: toolName, result });

                  // Append tool result to messages — LLM will summarise it next turn
                  currentMessages.push({
                    role: "tool",
                    tool_call_id: tc.id,
                    content: JSON.stringify(result),
                  } as any);
                }
              },

              // ── Turn done ──────────────────────────────────────────────────────
              onDone: async (text) => {
                if (toolCallsDetectedThisTurn && toolCallCount < MAX_TOOL_CALLS_PER_TURN) {
                  // Tools were called this turn → run another LLM turn with results
                  await runStreamTurn();
                  return;
                }

                // Final text answer (or max tool calls reached)
                fullResponse = text || fullResponse;

                if (!clientConnected) return; // client disconnected mid-stream

                const assistantMsg = await Message.create({
                  storeId,
                  conversationId: conversation!.id,
                  role: "assistant",
                  content: fullResponse,
                });

                await AgentLog.create({
                  storeId,
                  agentName: process.env.LLM_MODEL ?? LLM_MODEL,
                  action: "chat",
                  status: "success",
                  input: userText.slice(0, 500),
                  output: fullResponse.slice(0, 500),
                });

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
                await AgentLog.create({
                  storeId,
                  agentName: process.env.LLM_MODEL ?? LLM_MODEL,
                  action: "chat",
                  status: "error",
                  input: userText.slice(0, 500),
                  errorMessage: err.message,
                });
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
      let toolCallCount  = 0;
      let currentMessages: LLMMessage[] = [...initialMessages];

      while (toolCallCount < MAX_TOOL_CALLS_PER_TURN) {
        const client = getLlmClient();
        const model  = process.env.LLM_MODEL ?? LLM_MODEL;

        const response = await client.chat.completions.create({
          model,
          messages: currentMessages as any,
          tools: toolCallCount < MAX_TOOL_CALLS_PER_TURN ? (AGENT_TOOLS as any) : undefined,
          tool_choice: "auto",
          stream: false,
          max_tokens: 1024,
          temperature: 0.3,
        });

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
          if (toolCallCount >= MAX_TOOL_CALLS_PER_TURN) break;
          if (tc.type !== "function") continue;
          const result = await executeToolCall(tc.function.name, tc.function.arguments, toolContext);
          allToolsUsed.push(tc.function.name);
          toolCallCount++;
          currentMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          } as any);
        }
      }

      // Final answer is the last assistant message in the loop
      const lastMsg = currentMessages[currentMessages.length - 1];
      const finalResponse =
        lastMsg.role === "assistant" && lastMsg.content
          ? (lastMsg.content as string)
          : "";

      const assistantMsg = await Message.create({
        storeId,
        conversationId: conversation.id,
        role: "assistant",
        content: finalResponse,
      });

      await AgentLog.create({
        storeId,
        agentName: process.env.LLM_MODEL ?? LLM_MODEL,
        action: "chat",
        status: "success",
        input: userText.slice(0, 500),
        output: finalResponse.slice(0, 500),
      });

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
        await AgentLog.create({
          storeId,
          agentName: process.env.LLM_MODEL ?? LLM_MODEL,
          action: "chat",
          status: "error",
          input: userText.slice(0, 500),
          errorMessage: err instanceof Error ? err.message : String(err),
        });
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
      const user    = req.user!;

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
      const user    = req.user!;
      const convId  = Number(req.params.id);

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
 * Audit logs for store AI interactions (ADMIN only).
 * Returns last 50 entries ordered by most recent.
 */
agentRouter.get(
  "/logs",
  requireRole("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const logs = await forStore(AgentLog, storeId).findAll({
        order: [["createdAt", "DESC"]],
        limit: 50,
      });
      return res.json({ logs });
    } catch (err) {
      next(err);
    }
  }
);

export default agentRouter;
