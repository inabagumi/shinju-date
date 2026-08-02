-- Prepare Twitch platform schema for multi-platform support (#5589)
--
-- Confirmed already present:
--   - platform_type enum includes 'twitch'
--   - twitch_users / twitch_videos tables with unique platform IDs and FKs
--   - SELECT / INSERT / UPDATE RLS for authenticated on both tables
--
-- This migration closes gaps needed before batch/admin/web work:
--   1. display name on twitch_users (parity with youtube_channels.name)
--   2. DELETE RLS so admins can remove Twitch users (and CASCADE to videos)
--   3. audit_action values for Twitch user create/delete
--   4. indexes for talent joins, platform filtering, and login lookup
--   5. align twitch_video_type with Twitch Helix Videos + Clips APIs
--   6. require videos.platform (all existing rows are youtube)

-- ---------------------------------------------------------------------------
-- 1. twitch_users: display name (Twitch API: display_name)
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."twitch_users"
    ADD COLUMN "name" "text";

COMMENT ON COLUMN "public"."twitch_users"."name" IS
    'Twitch display name (Helix users.display_name). Distinct from login (twitch_login_name).';

COMMENT ON COLUMN "public"."twitch_users"."twitch_login_name" IS
    'Twitch login name (Helix users.login). Used in URLs: twitch.tv/{login}';

COMMENT ON COLUMN "public"."twitch_users"."twitch_user_id" IS
    'Twitch numeric user ID as text (Helix users.id). Stable unique identifier.';

COMMENT ON TABLE "public"."twitch_users" IS
    'Platform-specific Twitch broadcaster accounts linked to talents (1 talent : N users).';

COMMENT ON TABLE "public"."twitch_videos" IS
    'Platform-specific Twitch video/clip metadata linked to videos (1 video : 1 twitch_videos row).';

-- ---------------------------------------------------------------------------
-- 2. DELETE RLS for authenticated admins
--    youtube_channels already has DELETE; twitch_users did not.
--    twitch_videos needs DELETE so ON DELETE CASCADE from twitch_users succeeds
--    under RLS for authenticated role.
-- ---------------------------------------------------------------------------
CREATE POLICY "Enable delete for authenticated users"
    ON "public"."twitch_users"
    FOR DELETE
    TO "authenticated"
    USING (true);

CREATE POLICY "Enable delete for authenticated users"
    ON "public"."twitch_videos"
    FOR DELETE
    TO "authenticated"
    USING (true);

-- Same cascade gap exists for youtube_channels → youtube_videos.
CREATE POLICY "Enable delete for authenticated users"
    ON "public"."youtube_videos"
    FOR DELETE
    TO "authenticated"
    USING (true);

-- ---------------------------------------------------------------------------
-- 3. Audit actions for Twitch user management (parity with YOUTUBE_CHANNEL_*)
-- ---------------------------------------------------------------------------
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'TWITCH_USER_CREATE';
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'TWITCH_USER_DELETE';

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------
-- Load talent → twitch_users / filter users by talent
CREATE INDEX "idx_twitch_users_talent_id"
    ON "public"."twitch_users" USING "btree" ("talent_id");

-- Resolve user by login (registration / sync by login name)
CREATE INDEX "idx_twitch_users_login_name"
    ON "public"."twitch_users" USING "btree" ("twitch_login_name");

-- List / cascade by owning Twitch user
CREATE INDEX "idx_twitch_videos_twitch_user_id"
    ON "public"."twitch_videos" USING "btree" ("twitch_user_id");

-- Admin / public platform filter (youtube | twitch)
CREATE INDEX "idx_videos_platform"
    ON "public"."videos" USING "btree" ("platform");

-- youtube_channels also lacks talent_id index; add for join parity
CREATE INDEX "idx_youtube_channels_talent_id"
    ON "public"."youtube_channels" USING "btree" ("talent_id");

CREATE INDEX "idx_youtube_videos_youtube_channel_id"
    ON "public"."youtube_videos" USING "btree" ("youtube_channel_id");

-- ---------------------------------------------------------------------------
-- 5. Align twitch_video_type with Twitch APIs
--    Helix Get Videos: type = archive | highlight | upload
--    Helix Get Clips: separate resource; stored as 'clip' under twitch_video_id
--    Previous values 'vod' / 'premiere' were not Helix video types.
--    Tables are empty in production (Twitch not yet integrated), so recreate.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."twitch_videos"
    ALTER COLUMN "type" DROP DEFAULT;

ALTER TABLE "public"."twitch_videos"
    ALTER COLUMN "type" TYPE "text" USING "type"::"text";

DROP TYPE "public"."twitch_video_type";

CREATE TYPE "public"."twitch_video_type" AS ENUM (
    'archive',
    'highlight',
    'upload',
    'clip'
);

ALTER TYPE "public"."twitch_video_type" OWNER TO "postgres";

COMMENT ON TYPE "public"."twitch_video_type" IS
    'Twitch content kind: archive/highlight/upload from Helix Videos; clip from Helix Clips.';

-- No existing rows; cast is a no-op on empty table
ALTER TABLE "public"."twitch_videos"
    ALTER COLUMN "type" TYPE "public"."twitch_video_type"
    USING (
        CASE "type"
            WHEN 'vod' THEN 'archive'::"public"."twitch_video_type"
            WHEN 'premiere' THEN 'archive'::"public"."twitch_video_type"
            WHEN 'archive' THEN 'archive'::"public"."twitch_video_type"
            WHEN 'highlight' THEN 'highlight'::"public"."twitch_video_type"
            WHEN 'upload' THEN 'upload'::"public"."twitch_video_type"
            WHEN 'clip' THEN 'clip'::"public"."twitch_video_type"
            ELSE NULL
        END
    );

-- ---------------------------------------------------------------------------
-- 6. Require videos.platform for multi-platform integrity
-- ---------------------------------------------------------------------------
UPDATE "public"."videos"
SET "platform" = 'youtube'
WHERE "platform" IS NULL;

ALTER TABLE "public"."videos"
    ALTER COLUMN "platform" SET NOT NULL;

COMMENT ON COLUMN "public"."videos"."platform" IS
    'Source platform of the video (youtube | twitch). Required for multi-platform routing.';
