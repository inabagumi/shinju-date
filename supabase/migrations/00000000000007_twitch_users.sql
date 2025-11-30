-- twitch_users テーブル定義

CREATE TABLE IF NOT EXISTS "public"."twitch_users" (
    "talent_id" "uuid" NOT NULL,
    "twitch_user_id" "text" NOT NULL,
    "twitch_login_name" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE "public"."twitch_users" OWNER TO "postgres";

ALTER TABLE ONLY "public"."twitch_users"
    ADD CONSTRAINT "twitch_users_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."twitch_users"
    ADD CONSTRAINT "twitch_users_twitch_user_id_key" UNIQUE ("twitch_user_id");
