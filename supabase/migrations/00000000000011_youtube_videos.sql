-- youtube_videos テーブル定義

CREATE TABLE IF NOT EXISTS "public"."youtube_videos" (
    "video_id" "uuid" NOT NULL,
    "youtube_video_id" "text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "youtube_channel_id" "uuid" NOT NULL
);

ALTER TABLE "public"."youtube_videos" OWNER TO "postgres";

ALTER TABLE ONLY "public"."youtube_videos"
    ADD CONSTRAINT "youtube_videos_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."youtube_videos"
    ADD CONSTRAINT "youtube_videos_video_id_unique" UNIQUE ("video_id");
ALTER TABLE ONLY "public"."youtube_videos"
    ADD CONSTRAINT "youtube_videos_youtube_video_id_key" UNIQUE ("youtube_video_id");
