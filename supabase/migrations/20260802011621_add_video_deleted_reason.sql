-- Why a video was soft-deleted. Used so talent restore re-opens only videos
-- deleted because the talent itself was deleted.

CREATE TYPE "public"."video_deleted_reason" AS ENUM (
    -- No longer available on the source platform (YouTube check/sync).
    'unavailable',
    -- Intentionally withdrawn via admin (not restored when a talent is restored).
    'withdrawn',
    -- Soft-deleted because the parent talent was soft-deleted.
    'talent_deleted'
);

ALTER TYPE "public"."video_deleted_reason" OWNER TO "postgres";

ALTER TABLE "public"."videos"
    ADD COLUMN "deleted_reason" "public"."video_deleted_reason";

COMMENT ON COLUMN "public"."videos"."deleted_reason" IS 'Why the video was soft-deleted. NULL when not deleted. unavailable = gone from source platform; withdrawn = intentional admin removal; talent_deleted = parent talent soft-deleted. Only talent_deleted is restored when the talent is restored.';

-- Batch restore: talent_deleted videos under restored talents
CREATE INDEX "ix_videos_deleted_reason_talent_deleted"
    ON "public"."videos" USING "btree" ("talent_id")
    WHERE "deleted_at" IS NOT NULL AND "deleted_reason" = 'talent_deleted';

-- Batch cascade soft-delete: non-deleted videos under deleted talents
CREATE INDEX "ix_videos_active_by_talent"
    ON "public"."videos" USING "btree" ("talent_id")
    WHERE "deleted_at" IS NULL;
