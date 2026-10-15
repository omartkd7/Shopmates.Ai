import { Router, Request, Response, NextFunction } from "express";
import { AgentLog, Conversation, Message, forStore } from "../models";
import { authenticate, injectTenant, requireRole, validate } from "../middlewares";
import { retrieveContext } from "../services/rag";
import { streamChat, chat, buildSystemPrompt, LLM_MODEL, type LLMMessage } from "../services/llm";
import { z } from "zod";

const agentRouter = Router();

agentRouter.use(authenticate, injectTenant);

const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.coerce.number().int().positive().optional(),
});

// ─── POST /api/agent/chat ─────────────────────────────────────────────────────
/**
 * Chat with the ShopMate AI agent.
 *
 * Supports two response modes driven by the Accept header:
 *   - text/event-stream  → Server-Sent Events (real-time streaming)
 *   - application/json   → single JSON response (for testing)
 *
 * Pipeline per turn:
 *   1. Get/create conversation
 *   2. Persist user message
 *   3. Retrieve RAG context (storeId-scoped)
 *   4. Build message history with system prompt + context injection
 *   5. Stream LLM response token-by-token
 *   6. Persist assistant message + audit log
 */
agentRouter.post(
  "/chat",
  validate(chatMessageSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    const storeId = req.storeId as number;
    const user = req.user!;
    const { message: userText, conversationId } = req.body as {
      message: string;
      conversationId?: number;
    };

    const isSSE = (req.headers.accept ?? "").includes("text/event-stream");

    try {
      // ── 1. Get or create conversation ────────────────────────────────────
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

      // ── 2. Persist user message ───────────────────────────────────────────
      await Message.create({
        storeId,
        conversationId: conversation.id,
        role: "user",
        content: userText,
      });

      // ── 3. Retrieve RAG context (always filtered by storeId from JWT) ─────
      const ragChunks = await retrieveContext(userText, storeId);

      // ── 4. Build message history ──────────────────────────────────────────
      // System prompt comes first, then conversation history, then the RAG
      // context is injected as a system message immediately before the latest
      // user question — so the LLM sees it as the most relevant signal.

      // Fetch last 10 messages for context window (keeps tokens manageable)
      const history = await Message.findAll({
        where: { conversationId: conversation.id },
        order: [["createdAt", "ASC"]],
        limit: 10,
        attributes: ["role", "content"],
      });

      const messages: LLMMessage[] = [
        // 1. System prompt with guardrails
        {
          role: "system",
          content: buildSystemPrompt("ShopMate"),
        },
        // 2. Conversation history (all turns except the just-added user message)
        ...history.slice(0, -1).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        // 3. RAG context injection (data, not instructions — security rule)
        ...(ragChunks.length > 0
          ? [
              {
                role: "system" as const,
                content:
                  `<context>\n` +
                  ragChunks
                    .map(
                      (c) =>
                        `[${c.source}] (similarité: ${(c.score * 100).toFixed(0)}%)\n${c.content}`
                    )
                    .join("\n\n---\n\n") +
                  `\n</context>`,
              },
            ]
          : []),
        // 4. Latest user message
        {
          role: "user",
          content: userText,
        },
      ];

      // ── 5. Stream or single-shot LLM call ─────────────────────────────────

      if (isSSE) {
        // Server-Sent Events mode
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering

        // Send conversation ID immediately so the client can track it
        res.write(
          `data: ${JSON.stringify({ type: "start", conversationId: conversation.id })}\n\n`
        );

        let fullResponse = "";

        await streamChat(messages, undefined, {
          onToken: (token) => {
            // Don't forward internal tool-call markers to the client in this task
            if (!token.startsWith("\n__TOOL_CALL__:")) {
              res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
            }
            fullResponse += token.startsWith("\n__TOOL_CALL__:") ? "" : token;
          },
          onDone: async (text) => {
            fullResponse = text;

            // Persist assistant message
            const assistantMsg = await Message.create({
              storeId,
              conversationId: conversation!.id,
              role: "assistant",
              content: fullResponse,
            });

            // Audit log (sanitised — no raw embeddings or keys)
            await AgentLog.create({
              storeId,
              agentName: LLM_MODEL,
              action: "chat",
              status: "success",
              input: userText.slice(0, 500),
              output: fullResponse.slice(0, 500),
            });

            res.write(
              `data: ${JSON.stringify({
                type: "done",
                conversationId: conversation!.id,
                messageId: assistantMsg.id,
                ragUsed: ragChunks.length > 0,
                sourcesUsed: ragChunks.map((c) => c.source),
              })}\n\n`
            );
            res.end();
          },
          onError: async (err) => {
            await AgentLog.create({
              storeId,
              agentName: LLM_MODEL,
              action: "chat",
              status: "error",
              input: userText.slice(0, 500),
              errorMessage: err.message,
            });

            res.write(
              `data: ${JSON.stringify({ type: "error", message: "Une erreur est survenue. Réessayez." })}\n\n`
            );
            res.end();
          },
        });

        return;
      }

      // JSON mode (Postman / testing)
      const fullResponse = await chat(messages);

      const assistantMsg = await Message.create({
        storeId,
        conversationId: conversation.id,
        role: "assistant",
        content: fullResponse,
      });

      await AgentLog.create({
        storeId,
        agentName: LLM_MODEL,
        action: "chat",
        status: "success",
        input: userText.slice(0, 500),
        output: fullResponse.slice(0, 500),
      });

      return res.json({
        conversationId: conversation.id,
        messageId: assistantMsg.id,
        response: fullResponse,
        ragUsed: ragChunks.length > 0,
        sourcesUsed: ragChunks.map((c) => c.source),
      });
    } catch (err) {
      // Log the error before forwarding to global error handler
      try {
        await AgentLog.create({
          storeId,
          agentName: LLM_MODEL,
          action: "chat",
          status: "error",
          input: userText.slice(0, 500),
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      } catch {
        /* ignore secondary log failure */
      }
      next(err);
    }
  }
);

// ─── GET /api/agent/conversations ────────────────────────────────────────────
/**
 * List conversation history for the current user.
 */
agentRouter.get(
  "/conversations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const user = req.user!;

      const conversations = await forStore(Conversation, storeId).findAll({
        where: { userId: user.userId },
        include: [
          {
            association: "messages",
            attributes: ["id", "role", "content", "createdAt"],
          },
        ],
        order: [["updatedAt", "DESC"]],
      });

      return res.json({ conversations });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/agent/logs ──────────────────────────────────────────────────────
/**
 * Audit logs for store AI interactions (ADMIN only).
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
