-- Filter the video search by kind (#6804). `search_videos_v3` adds
-- `video_kinds` to `search_videos_v2` so a page of shorts or regular videos
-- keeps its full size, and `count_videos_v1` counts the videos the search
-- matches for the number of results under the heading.
--
-- `search_videos_v2` is kept until the deployed site stops calling it.

CREATE OR REPLACE FUNCTION "public"."search_videos_v3"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint DEFAULT 20, "video_kinds" "public"."video_kind"[] DEFAULT NULL) RETURNS SETOF "public"."videos"
    LANGUAGE "sql"
    AS $$
  SELECT *
  FROM videos
  WHERE
    (query IS NULL OR query = '' OR title &@~ pgroonga_query_expand('terms', 'synonyms', 'synonyms', '"' || query || '"')) AND
    (COALESCE(array_length(channel_ids, 1), 0) = 0 OR talent_id = ANY(channel_ids)) AND
    (video_kinds IS NULL OR video_kind = ANY(video_kinds)) AND
    published_at < until
  ORDER BY
    published_at DESC
  LIMIT
    perpage;
$$;
ALTER FUNCTION "public"."search_videos_v3"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint, "video_kinds" "public"."video_kind"[]) OWNER TO "postgres";

-- The site drops the videos whose talent the caller cannot read (it embeds
-- `talents!inner`) and the videos with neither a YouTube nor a Twitch video,
-- so the count leaves them out as well. The function runs with the caller's
-- rights, so the row-level security of each table applies to the subqueries.
CREATE OR REPLACE FUNCTION "public"."count_videos_v1"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "video_kinds" "public"."video_kind"[] DEFAULT NULL) RETURNS bigint
    LANGUAGE "sql"
    AS $$
  SELECT count(*)
  FROM videos
  WHERE
    (query IS NULL OR query = '' OR videos.title &@~ pgroonga_query_expand('terms', 'synonyms', 'synonyms', '"' || query || '"')) AND
    (COALESCE(array_length(channel_ids, 1), 0) = 0 OR videos.talent_id = ANY(channel_ids)) AND
    (video_kinds IS NULL OR videos.video_kind = ANY(video_kinds)) AND
    videos.published_at < until AND
    EXISTS (SELECT 1 FROM talents WHERE talents.id = videos.talent_id) AND
    (
      EXISTS (SELECT 1 FROM youtube_videos WHERE youtube_videos.video_id = videos.id) OR
      EXISTS (SELECT 1 FROM twitch_videos WHERE twitch_videos.video_id = videos.id)
    );
$$;
ALTER FUNCTION "public"."count_videos_v1"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "video_kinds" "public"."video_kind"[]) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."search_videos_v3"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint, "video_kinds" "public"."video_kind"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."search_videos_v3"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint, "video_kinds" "public"."video_kind"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_videos_v3"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint, "video_kinds" "public"."video_kind"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."count_videos_v1"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "video_kinds" "public"."video_kind"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."count_videos_v1"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "video_kinds" "public"."video_kind"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_videos_v1"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "video_kinds" "public"."video_kind"[]) TO "service_role";
