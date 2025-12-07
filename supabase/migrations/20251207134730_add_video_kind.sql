-- Add video_kind ENUM type and column to videos table
-- This supports classification of videos including YouTube Shorts, standard videos, live streams, and premieres
-- Future expansion: TikTok, Instagram Reels, Twitch clips, etc.

-- Create ENUM type for video kinds
CREATE TYPE "public"."video_kind" AS ENUM (
    'standard',      -- Regular videos (including VODs)
    'short',         -- Short-form content (YouTube Shorts, TikTok, Instagram Reels, etc.)
    'live_stream',   -- Live streaming content
    'premiere'       -- Premiere videos
);

ALTER TYPE "public"."video_kind" OWNER TO "postgres";

COMMENT ON TYPE "public"."video_kind" IS 'Video content type classification for different formats and platforms';

-- Add video_kind column to videos table
ALTER TABLE "public"."videos"
    ADD COLUMN "video_kind" "public"."video_kind" DEFAULT 'standard' NOT NULL;

COMMENT ON COLUMN "public"."videos"."video_kind" IS 'Type of video content (standard, short, live_stream, premiere)';

-- Create index for filtering by video_kind
CREATE INDEX "idx_videos_video_kind" ON "public"."videos" USING "btree" ("video_kind");

-- Backfill existing videos based on duration and status
-- YouTube Shorts are defined as videos with duration <= 60 seconds
-- Live streams are identified by status 'LIVE' or 'UPCOMING'
UPDATE "public"."videos"
SET "video_kind" = CASE
    -- Classify as live_stream if status indicates live content
    WHEN "status" IN ('LIVE', 'UPCOMING') THEN 'live_stream'::video_kind
    -- Classify as short if duration is 60 seconds or less (PT60S or less)
    -- ISO 8601 duration format: PT60S = 60 seconds, PT1M = 1 minute
    WHEN (
        -- Extract total seconds from ISO 8601 duration
        EXTRACT(EPOCH FROM "duration"::interval)
    ) <= 60 THEN 'short'::video_kind
    -- Default to standard for all other videos
    ELSE 'standard'::video_kind
END;
