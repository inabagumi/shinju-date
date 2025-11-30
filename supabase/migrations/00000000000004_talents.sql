-- talents テーブル定義

CREATE TABLE IF NOT EXISTS "public"."talents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "theme_color" character varying(7)
);

ALTER TABLE "public"."talents" OWNER TO "postgres";

ALTER TABLE ONLY "public"."talents"
    ADD CONSTRAINT "talents_pkey" PRIMARY KEY ("id");
