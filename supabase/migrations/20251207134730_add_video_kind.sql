CREATE TYPE "public"."video_kind" AS ENUM (
    'standard',
    'short'
);

ALTER TYPE "public"."video_kind" OWNER TO "postgres";

ALTER TABLE "public"."videos"
    ADD COLUMN "video_kind" "public"."video_kind" DEFAULT 'standard' NOT NULL;

CREATE INDEX "idx_videos_video_kind" ON "public"."videos" USING "btree" ("video_kind");
