import OpenAI from "openai";

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
