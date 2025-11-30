-- videos テーブル定義と関連関数

CREATE TABLE IF NOT EXISTS "public"."videos" (
    "title" "text" NOT NULL,
    "duration" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "published_at" timestamp with time zone NOT NULL,
    "deleted_at" timestamp with time zone,
    "visible" boolean DEFAULT true NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thumbnail_id" "uuid",
    "talent_id" "uuid" NOT NULL,
    "platform" "public"."platform_type",
    "status" "public"."video_status" DEFAULT 'ENDED'::"public"."video_status" NOT NULL
)
WITH ("autovacuum_vacuum_scale_factor"='0.05', "autovacuum_vacuum_threshold"='1000');

ALTER TABLE "public"."videos" OWNER TO "postgres";

ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");

COMMENT ON TABLE "public"."videos" IS 'YouTubeに投稿された動画やライブ配信';

-- インデックス
CREATE INDEX "idx_videos_published_at_desc" ON "public"."videos" USING "btree" ("published_at" DESC);
CREATE INDEX "idx_videos_status" ON "public"."videos" USING "btree" ("status");
CREATE INDEX "ix_videos_deleted_at" ON "public"."videos" USING "btree" ("deleted_at");
CREATE INDEX "ix_videos_title" ON "public"."videos" USING "pgroonga" ("title") WITH ("normalizers"='
    NormalizerNFKC150(
      "remove_symbol", true,
      "unify_hyphen", true,
      "unify_hyphen_and_prolonged_sound_mark", true,
      "unify_kana", true,
      "unify_kana_case", true,
      "unify_katakana_bu_sound", true,
      "unify_katakana_di_sound", true,
      "unify_katakana_v_sounds", true,
      "unify_katakana_wo_sound", true,
      "unify_middle_dot", true,
      "unify_prolonged_sound_mark", true
    )
  ', "tokenizer"='
    TokenNgram(
      "n", 2,
      "loose_blank", true,
      "loose_symbol", true
    )
  ');
CREATE INDEX "videos_visible_idx" ON "public"."videos" USING "btree" ("visible");

-- 関連関数
CREATE OR REPLACE FUNCTION "public"."search_videos_v2"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint DEFAULT 20) RETURNS SETOF "public"."videos"
    LANGUAGE "sql"
    AS $$
  SELECT *
  FROM videos
  WHERE
    (query IS NULL OR query = '' OR title &@~ pgroonga_query_expand('terms', 'synonyms', 'synonyms', '"' || query || '"')) AND
    (COALESCE(array_length(channel_ids, 1), 0) = 0 OR talent_id = ANY(channel_ids)) AND
    published_at < until
  ORDER BY
    published_at DESC
  LIMIT
    perpage;
$$;
ALTER FUNCTION "public"."search_videos_v2"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."suggestions_v2"("p_query" "text") RETURNS TABLE("term" "text", "priority" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  RETURN QUERY
    WITH all_matches AS (
      SELECT t.id, t.term, 1 AS priority FROM terms AS t WHERE t.term &^ p_query OR t.term &^~ p_query
      UNION ALL
      SELECT t.id, t.term, 2 AS priority FROM terms AS t WHERE (t.readings &^ p_query OR t.readings &^~ p_query) AND NOT (t.term &^ p_query OR t.term &^~ p_query)
    )
    SELECT am.term, MIN(am.priority) AS min_priority
    FROM all_matches AS am
    GROUP BY am.id, am.term
    ORDER BY min_priority ASC, length(am.term) ASC, am.term ASC
    LIMIT 10;
END;
$$;
ALTER FUNCTION "public"."suggestions_v2"("p_query" "text") OWNER TO "postgres";
