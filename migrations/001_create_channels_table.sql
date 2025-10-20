-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create index for efficient querying by slug
CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels (slug);

-- Create index for querying non-deleted channels
CREATE INDEX IF NOT EXISTS idx_channels_deleted_at ON channels (deleted_at) WHERE deleted_at IS NULL;
