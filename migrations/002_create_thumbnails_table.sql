-- Create thumbnails table
CREATE TABLE IF NOT EXISTS thumbnails (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  blur_data_url TEXT NOT NULL,
  etag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create index for efficient querying by path
CREATE INDEX IF NOT EXISTS idx_thumbnails_path ON thumbnails (path);

-- Create index for querying non-deleted thumbnails
CREATE INDEX IF NOT EXISTS idx_thumbnails_deleted_at ON thumbnails (deleted_at) WHERE deleted_at IS NULL;
