-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index function for document embeddings (will be used after table creation)
-- This SQL runs when the database is first initialized
