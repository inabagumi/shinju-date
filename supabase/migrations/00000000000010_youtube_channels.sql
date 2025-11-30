-- youtube_channels テーブル定義

CREATE TABLE IF NOT EXISTS "public"."youtube_channels" (
    "talent_id" "uuid" NOT NULL,
    "youtube_channel_id" "text" NOT NULL,
    "youtube_handle" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text"
);

ALTER TABLE "public"."youtube_channels" OWNER TO "postgres";

ALTER TABLE ONLY "public"."youtube_channels"
    ADD CONSTRAINT "youtube_channels_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."youtube_channels"
    ADD CONSTRAINT "youtube_channels_youtube_channel_id_key" UNIQUE ("youtube_channel_id");
