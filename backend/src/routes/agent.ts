import { Router, Request, Response, NextFunction } from "express";
import { AgentLog, Conversation, Message, forStore } from "../models";
import { authenticate, injectTenant, requireRole, validate } from "../middlewares";
import { z } from "zod";

const agentRouter = Router();

agentRouter.use(authenticate, injectTenant);

const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty"),
  conversationId: z.coerce.number().int().positive().optional(),
});

/**
 * POST /api/agent/chat
 * Chat with the ShopMate AI agent. Supports Server-Sent Events (SSE) or JSON.
 */
agentRouter.post(
  "/chat",
  validate(chatMessageSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const user = req.user!;
      const { message: userText, conversationId } = req.body;

      // 1. Get or create conversation
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

      // 2. Persist user message
      await Message.create({
        storeId,
        conversationId: conversation.id,
        role: "user",
        content: userText,
      });

      // 3. Draft assistant response (in French/Darija)
      const assistantText = `Bonjour ! Je suis l'assistant ShopMate AI. J'ai bien reçu votre message : "${userText}". Comment puis-je vous aider avec notre boutique ?`;

      // 4. Persist assistant message
      const assistantMsg = await Message.create({
        storeId,
        conversationId: conversation.id,
        role: "assistant",
        content: assistantText,
      });

      // 5. Log agent audit interaction
      await AgentLog.create({
        storeId,
        agentName: "ShopMate-Assistant",
        action: "chat",
        status: "success",
        input: userText,
        output: assistantText,
      });

      // Support SSE if requested by client header
      const acceptHeader = req.headers.accept || "";
      if (acceptHeader.includes("text/event-stream")) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        res.write(`data: ${JSON.stringify({ token: assistantText, done: true, conversationId: conversation.id })}\n\n`);
        res.end();
        return;
      }

      return res.json({
        conversationId: conversation.id,
        message: assistantMsg,
        response: assistantText,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/agent/conversations
 * List conversation history for current user.
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

/**
 * GET /api/agent/logs
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
