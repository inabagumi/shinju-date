-- Create terms table
CREATE TABLE IF NOT EXISTS terms (
  id BIGSERIAL PRIMARY KEY,
  term TEXT NOT NULL UNIQUE,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  readings TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying by term
CREATE INDEX IF NOT EXISTS idx_terms_term ON terms (term);

-- Create index for efficient full-text search on terms
CREATE INDEX IF NOT EXISTS idx_terms_updated_at ON terms (updated_at DESC);
