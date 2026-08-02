-- Identify why a video was soft-deleted so talent restore can cascade-restore
-- only videos deleted because of talent cascade, not manual admin deletes.

CREATE TYPE "public"."video_deleted_reason" AS ENUM (
    'manual',
    'talent_cascade'
);

ALTER TYPE "public"."video_deleted_reason" OWNER TO "postgres";

ALTER TABLE "public"."videos"
    ADD COLUMN "deleted_reason" "public"."video_deleted_reason";

COMMENT ON COLUMN "public"."videos"."deleted_reason" IS 'Why the video was soft-deleted. NULL when not deleted. talent_cascade videos are restored when the talent is restored; manual deletes are not.';

-- Support batch restore: active talents with cascade-deleted videos
CREATE INDEX "ix_videos_deleted_reason_talent_cascade"
    ON "public"."videos" USING "btree" ("talent_id")
    WHERE "deleted_at" IS NOT NULL AND "deleted_reason" = 'talent_cascade';

-- Support batch cascade soft-delete: non-deleted videos under deleted talents
-- (talent_id already indexed via FK; partial index for undeleted videos speeds cascade)
CREATE INDEX "ix_videos_active_by_talent"
    ON "public"."videos" USING "btree" ("talent_id")
    WHERE "deleted_at" IS NULL;
