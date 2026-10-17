import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { Document, Chunk, forStore } from "../models";
import Document_Model from "../models/Document";
import { authenticate, injectTenant, requireRole, validate } from "../middlewares";
import { chunkText, embedChunks, retrieveContext, SIMILARITY_THRESHOLD } from "../services/rag";
import sequelize from "../config/database";
import { z } from "zod";

const documentsRouter = Router();

// ─── Multer: accept md/txt in memory (max 2 MB) ──────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["text/plain", "text/markdown"];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(md|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only .md and .txt files are accepted"));
    }
  },
});

// ─── All routes: ADMIN only ───────────────────────────────────────────────────
documentsRouter.use(authenticate, injectTenant, requireRole("ADMIN"));

// ─── Validation schemas ───────────────────────────────────────────────────────
const createDocumentSchema = z.object({
  name: z.string().trim().min(1, "Document name is required"),
});

// ─── GET /api/documents ───────────────────────────────────────────────────────
/**
 * List all RAG knowledge documents for the current store.
 */
documentsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const documents = await forStore(Document, storeId).findAll({
        order: [["createdAt", "DESC"]],
        attributes: ["id", "name", "mimeType", "status", "createdAt", "updatedAt"],
      });
      const chunkCounts = documents.length
        ? ((await Chunk.findAll({
            where: {
              storeId,
              documentId: documents.map((document) => (document as Document_Model).id),
            },
            attributes: [
              "documentId",
              [sequelize.fn("COUNT", sequelize.col("id")), "chunksCreated"],
            ],
            group: ["documentId"],
            raw: true,
          })) as unknown as Array<{ documentId: number; chunksCreated: string }>)
        : [];
      const chunksByDocument = new Map(
        chunkCounts.map(({ documentId, chunksCreated }) => [
          documentId,
          Number(chunksCreated),
        ])
      );
      return res.json({
        documents: documents.map((document) => ({
          ...document.toJSON(),
          chunksCreated: chunksByDocument.get((document as Document_Model).id) ?? 0,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/documents/:id ───────────────────────────────────────────────────
/**
 * Retrieve a single document with its chunk count.
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
            attributes: ["id", "content"],
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

// ─── POST /api/documents ──────────────────────────────────────────────────────
/**
 * Upload an md/txt knowledge document, chunk it, embed it, and store all
 * chunks with their 1536-dim embeddings in pgvector — all in one transaction.
 *
 * Body (multipart/form-data):
 *   - file  : .md or .txt file  (required)
 *   - name  : human-readable document name  (required)
 */
documentsRouter.post(
  "/",
  upload.single("file"),
  validate(createDocumentSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({ error: "A .md or .txt file is required" });
    }

    const storeId = req.storeId as number;
    const userId = req.user!.userId;
    const { name } = req.body as { name: string };

    // Decode uploaded file to UTF-8 text
    const rawText = req.file.buffer.toString("utf-8");

    const transaction = await sequelize.transaction();

    try {
      // 1. Create the Document record (status = processing)
      const document = await Document.create(
        {
          storeId,
          uploadedBy: userId,
          name,
          fileUrl: `upload:${Date.now()}-${req.file.originalname}`,
          mimeType: req.file.mimetype || "text/plain",
          status: "processing",
        },
        { transaction }
      );

      // 2. Split into ~800-char chunks
      const textChunks = chunkText(rawText);

      if (textChunks.length === 0) {
        await transaction.rollback();
        return res.status(422).json({ error: "Document has no usable text content" });
      }

      // 3. Generate embeddings (batched, single API call for ≤100 chunks)
      const embeddings = await embedChunks(textChunks);

      // 4. Bulk-insert all chunks with their embeddings
      await Chunk.bulkCreate(
        textChunks.map((content, i) => ({
          storeId,
          documentId: document.id,
          content,
          embedding: embeddings[i],
        })),
        { transaction }
      );

      // 5. Mark document as completed
      await document.update({ status: "completed" }, { transaction });

      await transaction.commit();

      return res.status(201).json({
        message: `Document indexed successfully`,
        document: {
          id: document.id,
          name: document.name,
          status: document.status,
          chunksCreated: textChunks.length,
        },
      });
    } catch (err) {
      await transaction.rollback();

      // If embedding API fails, mark document as failed (best-effort)
      // Document may not exist if rollback removed it, so we ignore errors here
      next(err);
    }
  }
);

// ─── PUT /api/documents/:id/reingest ─────────────────────────────────────────
/**
 * Re-upload a document file and re-run the full chunking + embedding pipeline.
 * All old chunks for this document are deleted first (atomic transaction).
 *
 * Body (multipart/form-data):
 *   - file  : new .md or .txt file  (required)
 */
documentsRouter.put(
  "/:id/reingest",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({ error: "A .md or .txt file is required for re-ingestion" });
    }

    const storeId = req.storeId as number;
    const documentId = Number(req.params.id);

    const document = (await forStore(Document, storeId).findOne({
      where: { id: documentId },
    })) as Document_Model | null;

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const rawText = req.file.buffer.toString("utf-8");
    const transaction = await sequelize.transaction();

    try {
      // 1. Mark as processing
      await document.update({ status: "processing" }, { transaction });

      // 2. Delete all existing chunks for this document
      await Chunk.destroy({ where: { documentId }, transaction });

      // 3. Chunk + embed the new content
      const textChunks = chunkText(rawText);
      if (textChunks.length === 0) {
        await transaction.rollback();
        return res.status(422).json({ error: "Document has no usable text content" });
      }

      const embeddings = await embedChunks(textChunks);

      // 4. Insert new chunks
      await Chunk.bulkCreate(
        textChunks.map((content, i) => ({
          storeId,
          documentId,
          content,
          embedding: embeddings[i],
        })),
        { transaction }
      );

      // 5. Update file metadata + mark completed
      await document.update(
        {
          fileUrl: `upload:${Date.now()}-${req.file!.originalname}`,
          mimeType: req.file!.mimetype || "text/plain",
          status: "completed",
        },
        { transaction }
      );

      await transaction.commit();

      return res.json({
        message: "Document re-ingested successfully",
        document: {
          id: document.id,
          name: document.name,
          status: "completed",
          chunksCreated: textChunks.length,
        },
      });
    } catch (err) {
      await transaction.rollback();
      next(err);
    }
  }
);

// ─── DELETE /api/documents/:id ────────────────────────────────────────────────
/**
 * Delete a document and all its chunks (cascade in transaction).
 */
documentsRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const documentId = Number(req.params.id);

      const document = await forStore(Document, storeId).findOne({
        where: { id: documentId },
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const transaction = await sequelize.transaction();
      try {
        // Delete chunks first (no DB-level CASCADE to guarantee cross-tenant safety)
        await Chunk.destroy({ where: { storeId, documentId }, transaction });
        await document.destroy({ transaction });
        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      return res.json({ message: "Document and all its chunks deleted" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/documents/search ───────────────────────────────────────────────
/**
 * Semantic search endpoint — useful for testing RAG retrieval from Postman
 * before the full agent is wired up.
 *
 * Any authenticated user can call this (customer or admin); the agent will
 * use retrieveContext() directly, but this route lets you verify results.
 *
 * GET /api/documents/search?q=Vous+livrez+%C3%A0+Casablanca+%3F
 *
 * Response when chunks found:
 *   { hasContext: true, threshold: 0.75, chunks: [...] }
 *
 * Response when no chunk crosses the threshold:
 *   { hasContext: false, threshold: 0.75, chunks: [], message: "Je n'ai pas cette information" }
 */
documentsRouter.get(
  "/search",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const question = (req.query.q as string | undefined)?.trim();

      if (!question || question.length === 0) {
        return res
          .status(400)
          .json({ error: "Query parameter `q` is required" });
      }

      const chunks = await retrieveContext(question, storeId);

      if (chunks.length === 0) {
        return res.json({
          hasContext: false,
          threshold: SIMILARITY_THRESHOLD,
          chunks: [],
          message: "Je n'ai pas cette information",
        });
      }

      return res.json({
        hasContext: true,
        threshold: SIMILARITY_THRESHOLD,
        count: chunks.length,
        chunks,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default documentsRouter;
