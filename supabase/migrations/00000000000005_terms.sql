-- terms テーブル定義

CREATE TABLE IF NOT EXISTS "public"."terms" (
    "term" "text" NOT NULL,
    "synonyms" "text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "readings" "text"[] NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE "public"."terms" OWNER TO "postgres";

ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_term_key" UNIQUE ("term");

COMMENT ON TABLE "public"."terms" IS '用語集';
COMMENT ON COLUMN "public"."terms"."term" IS '単語';
COMMENT ON COLUMN "public"."terms"."synonyms" IS '同義語の一覧';
COMMENT ON COLUMN "public"."terms"."created_at" IS '作成日時';
COMMENT ON COLUMN "public"."terms"."updated_at" IS '更新日時';
COMMENT ON COLUMN "public"."terms"."readings" IS '読み方の一覧';

-- インデックス
CREATE INDEX "ix_synonyms_term" ON "public"."terms" USING "pgroonga" ("term" "extensions"."pgroonga_text_term_search_ops_v2");
CREATE INDEX "pgroonga_terms_prefix_search" ON "public"."terms" USING "pgroonga" ("readings" "extensions"."pgroonga_text_array_term_search_ops_v2");
CREATE INDEX "terms_synonyms" ON "public"."terms" USING "pgroonga" ("synonyms" "extensions"."pgroonga_text_array_term_search_ops_v2");
