-- thumbnails テーブル定義

CREATE TABLE IF NOT EXISTS "public"."thumbnails" (
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "path" "text" NOT NULL,
    "width" bigint NOT NULL,
    "height" bigint NOT NULL,
    "blur_data_url" "text" NOT NULL,
    "etag" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE "public"."thumbnails" OWNER TO "postgres";

ALTER TABLE ONLY "public"."thumbnails"
    ADD CONSTRAINT "thumbnails_pkey" PRIMARY KEY ("id");

COMMENT ON TABLE "public"."thumbnails" IS 'サムネイル';
