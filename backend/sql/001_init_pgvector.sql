
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for cosine similarity
CREATE INDEX IF NOT EXISTS "chunks_embedding_hnsw_idx"
ON "chunks"
USING hnsw ("embedding" vector_cosine_ops);
