import OpenAI from "openai";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database";

// ─── OpenAI client (embeddings only) ────────────────────────────────────────
// DeepSeek has no embedding endpoint; we use OpenAI text-embedding-3-small
// which produces exactly 1536 dimensions matching the pgvector column.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL =
  (process.env.EMBEDDING_MODEL as string | undefined) ??
  "text-embedding-3-small";

const CHUNK_SIZE = 800; // target characters per chunk
const CHUNK_OVERLAP = 100; // overlap to preserve context across boundaries

// ─── Chunking ────────────────────────────────────────────────────────────────

/**
 * Split raw text into overlapping chunks of ~CHUNK_SIZE characters.
 * Prefers splitting on double-newlines (paragraphs), then single newlines,
 * then spaces — never mid-word.
 */
export function chunkText(text: string): string[] {
  const normalised = text.replace(/\r\n/g, "\n").trim();
  if (normalised.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalised.length) {
    let end = Math.min(start + CHUNK_SIZE, normalised.length);

    // If we haven't reached the end, try to break at a natural boundary
    if (end < normalised.length) {
      // Prefer paragraph break
      const paraBreak = normalised.lastIndexOf("\n\n", end);
      if (paraBreak > start + CHUNK_OVERLAP) {
        end = paraBreak + 2;
      } else {
        // Fall back to line break
        const lineBreak = normalised.lastIndexOf("\n", end);
        if (lineBreak > start + CHUNK_OVERLAP) {
          end = lineBreak + 1;
        } else {
          // Fall back to space
          const spaceBreak = normalised.lastIndexOf(" ", end);
          if (spaceBreak > start + CHUNK_OVERLAP) {
            end = spaceBreak + 1;
          }
          // If no boundary found, hard-cut at CHUNK_SIZE
        }
      }
    }

    const chunk = normalised.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move forward with overlap
    start = Math.max(start + 1, end - CHUNK_OVERLAP);
  }

  return chunks;
}

// ─── Embedding ───────────────────────────────────────────────────────────────

/**
 * Generate an embedding vector for a single text string.
 * Returns a 1536-dim float array.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple chunks in a single batched API call.
 * OpenAI allows up to 2048 inputs per request.
 */
export async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return [];

  const BATCH_SIZE = 100; // stay well within API limits
  const results: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    // API returns results in the same order as input
    results.push(...response.data.map((d) => d.embedding));
  }

  return results;
}

// ─── Retrieval ───────────────────────────────────────────────────────────────

/**
 * A single retrieved chunk returned by retrieveContext().
 */
export interface RetrievedChunk {
  chunkId: number;
  documentId: number;
  /** Human-readable name of the source document (FAQ, size guide, etc.) */
  source: string;
  content: string;
  /** Cosine similarity score 0-1. Higher = more relevant. */
  score: number;
}

/**
 * Similarity threshold below which chunks are considered irrelevant.
 * 0.75 works well for French customer-service text with text-embedding-3-small.
 * Adjust downward if legitimate questions return nothing;
 * upward to cut noise from loosely related chunks.
 */
export const SIMILARITY_THRESHOLD = 0.75;

/** Maximum number of chunks to return. README says 4-6. */
const TOP_K = 6;

/**
 * Retrieves the most semantically similar chunks to `question` for a given
 * store, using pgvector HNSW index with cosine similarity.
 *
 * Returns an empty array when no chunk crosses SIMILARITY_THRESHOLD —
 * the agent must then respond "Je n'ai pas cette information."
 *
 * Security: storeId always comes from the JWT (server-injected), never
 * from the client. It filters both the WHERE clause and the HNSW scan.
 */
export async function retrieveContext(
  question: string,
  storeId: number
): Promise<RetrievedChunk[]> {
  // 1. Embed the question with the same model used at ingestion
  const questionEmbedding = await embedText(question);

  // 2. Format as pgvector literal: '[0.1,0.2,...]'
  const vectorLiteral = `[${questionEmbedding.join(",")}]`;

  // 3. Raw SQL with pgvector cosine distance operator (<=>)
  //    All parameters are :named replacements — zero SQL injection risk.

  const rows = (await sequelize.query(
    `
    SELECT
      c.id                                        AS "chunkId",
      c."documentId"                              AS "documentId",
      d.name                                      AS "source",
      c.content                                   AS "content",
      1 - (c.embedding <=> :vector::vector)       AS "score"
    FROM chunks c
    JOIN documents d ON d.id = c."documentId"
    WHERE c."storeId" = :storeId
      AND c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> :vector::vector) >= :threshold
    ORDER BY c.embedding <=> :vector::vector
    LIMIT :topK
    `,
    {
      replacements: {
        vector: vectorLiteral,
        storeId,
        threshold: SIMILARITY_THRESHOLD,
        topK: TOP_K,
      },
      type: QueryTypes.SELECT,
    }
  )) as RetrievedChunk[];

  return rows;
}
