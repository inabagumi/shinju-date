-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT NOT NULL REFERENCES channels(id),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  duration TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  thumbnail_id BIGINT REFERENCES thumbnails(id),
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create index for efficient querying by slug
CREATE INDEX IF NOT EXISTS idx_videos_slug ON videos (slug);

-- Create index for efficient querying by channel
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos (channel_id);

-- Create index for efficient querying by published_at
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos (published_at DESC);

-- Create index for querying visible and non-deleted videos
CREATE INDEX IF NOT EXISTS idx_videos_visible_deleted ON videos (visible, deleted_at) WHERE deleted_at IS NULL;
