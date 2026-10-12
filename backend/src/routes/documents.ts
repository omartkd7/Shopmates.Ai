import { Router, Request, Response, NextFunction } from "express";
import { Document, Chunk, forStore } from "../models";
import { authenticate, injectTenant, requireRole, validate } from "../middlewares";
import { z } from "zod";

const documentsRouter = Router();

// Documents management is restricted to Store ADMIN
documentsRouter.use(authenticate, injectTenant, requireRole("ADMIN"));

const createDocumentSchema = z.object({
  name: z.string().trim().min(1, "Document name is required"),
  fileUrl: z.string().trim().min(1, "File URL or content path is required"),
  mimeType: z.string().trim().default("text/plain"),
});

/**
 * GET /api/documents
 * List all RAG knowledge documents for the current store.
 */
documentsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const documents = await forStore(Document, storeId).findAll({
        order: [["createdAt", "DESC"]],
      });

      return res.json({ documents });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/documents/:id
 * Retrieve single document with its associated chunks.
 */
documentsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const documentId = Number(req.params.id);

      const document = await forStore(Document, storeId).findOne({
        where: { id: documentId },
        include: [
          {
            association: "chunks",
            attributes: ["id", "chunkIndex", "content"],
          },
        ],
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      return res.json({ document });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/documents
 * Register a new RAG knowledge document (ADMIN only).
 */
documentsRouter.post(
  "/",
  validate(createDocumentSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const userId = req.user!.userId;
      const { name, fileUrl, mimeType } = req.body;

      const document = await Document.create({
        storeId,
        uploadedBy: userId,
        name,
        fileUrl,
        mimeType,
        status: "pending",
      });

      return res.status(201).json({
        message: "Document submitted for RAG indexing",
        document,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default documentsRouter;
