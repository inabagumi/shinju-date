-- Leave out the videos the site cannot link to before the page size is
-- applied in `search_videos_v3`, and do not count them in `count_videos_v1`
-- (#7050). The site links to a video only when `getVideoUrl` (`apps/web`) can
-- build its URL, and leaves out the others:
--
-- - a YouTube video needs its YouTube video
-- - a Twitch video needs its Twitch video, and either the login name of its
--   user (for the channel page) or an ID that is not the placeholder of an
--   archive that is not ready yet (`live:{stream_id}`), unless it is a clip
--
-- The site left them out after the page was cut, so a page came back shorter
-- than `perpage` and the infinite scroll of the videos stopped there as if it
-- were the last page. The arguments and the result are the same, and the
-- deployed site does not show these videos either, so it keeps working with
-- this version.
--
-- The functions run with the caller's rights, so the row-level security of
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
    CASE videos.platform
      WHEN 'twitch' THEN EXISTS (
        SELECT 1
        FROM twitch_videos
        LEFT JOIN twitch_users ON twitch_users.id = twitch_videos.twitch_user_id
        WHERE
          twitch_videos.video_id = videos.id AND
          (
            COALESCE(twitch_users.twitch_login_name, '') <> '' OR
            (
              twitch_videos.twitch_video_id <> '' AND
              (twitch_videos.type = 'clip' OR NOT starts_with(twitch_videos.twitch_video_id, 'live:'))
            )
          )
      )
      ELSE EXISTS (
        SELECT 1
        FROM youtube_videos
        WHERE youtube_videos.video_id = videos.id AND youtube_videos.youtube_video_id <> ''
      )
    END
  ORDER BY
    videos.published_at DESC
  LIMIT
    perpage;
$$;

CREATE OR REPLACE FUNCTION "public"."count_videos_v1"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "video_kinds" "public"."video_kind"[] DEFAULT NULL) RETURNS bigint
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT count(*)
  FROM videos
  WHERE
    (query IS NULL OR query = '' OR videos.title &@~ pgroonga_query_expand('terms', 'synonyms', 'synonyms', '"' || query || '"')) AND
    (COALESCE(array_length(channel_ids, 1), 0) = 0 OR videos.talent_id = ANY(channel_ids)) AND
    (video_kinds IS NULL OR videos.video_kind = ANY(video_kinds)) AND
    videos.published_at < until AND
    EXISTS (SELECT 1 FROM talents WHERE talents.id = videos.talent_id) AND
    CASE videos.platform
      WHEN 'twitch' THEN EXISTS (
        SELECT 1
        FROM twitch_videos
        LEFT JOIN twitch_users ON twitch_users.id = twitch_videos.twitch_user_id
        WHERE
          twitch_videos.video_id = videos.id AND
          (
            COALESCE(twitch_users.twitch_login_name, '') <> '' OR
            (
              twitch_videos.twitch_video_id <> '' AND
              (twitch_videos.type = 'clip' OR NOT starts_with(twitch_videos.twitch_video_id, 'live:'))
            )
          )
      )
      ELSE EXISTS (
        SELECT 1
        FROM youtube_videos
        WHERE youtube_videos.video_id = videos.id AND youtube_videos.youtube_video_id <> ''
      )
    END;
$$;
