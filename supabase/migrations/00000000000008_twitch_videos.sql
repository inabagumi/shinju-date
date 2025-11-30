-- twitch_videos テーブル定義

CREATE TABLE IF NOT EXISTS "public"."twitch_videos" (
    "video_id" "uuid" NOT NULL,
    "twitch_video_id" "text" NOT NULL,
    "type" "public"."twitch_video_type",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "twitch_user_id" "uuid" NOT NULL
);

ALTER TABLE "public"."twitch_videos" OWNER TO "postgres";

ALTER TABLE ONLY "public"."twitch_videos"
    ADD CONSTRAINT "twitch_videos_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."twitch_videos"
    ADD CONSTRAINT "twitch_videos_twitch_video_id_key" UNIQUE ("twitch_video_id");
ALTER TABLE ONLY "public"."twitch_videos"
    ADD CONSTRAINT "twitch_videos_video_id_unique" UNIQUE ("video_id");
