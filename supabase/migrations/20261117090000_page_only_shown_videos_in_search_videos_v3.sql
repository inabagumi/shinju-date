-- Leave out the videos the site does not show before the page size is
-- applied in `search_videos_v3` (#7200), as `count_videos_v1` does: the videos
-- whose talent the caller cannot read and the videos with neither a YouTube
-- nor a Twitch video.
--
-- The site dropped them after the page was cut, so a page came back shorter
-- than `perpage` and the infinite scroll of the videos stopped there as if it
-- were the last page. The arguments and the result are the same, and the
-- deployed site drops exactly these videos, so it keeps working with this
-- version and gets full pages.
--
-- The function runs with the caller's rights, so the row-level security of
-- each table applies to the subqueries.

CREATE OR REPLACE FUNCTION "public"."search_videos_v3"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint DEFAULT 20, "video_kinds" "public"."video_kind"[] DEFAULT NULL) RETURNS SETOF "public"."videos"
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT *
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
    )
  ORDER BY
    videos.published_at DESC
  LIMIT
    perpage;
$$;
