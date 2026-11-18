-- Rename what still carries an old name or does not match the others (#7121).
-- Only the names change: the tables, the columns, the conditions of the
-- policies and the bodies of the functions stay the same.
--
--   1. `search_videos_v4` and `count_videos_v2`: `p_talent_ids` instead of
--      `channel_ids` (`talents` was once `channels`), and `p_` before every
--      argument as the newer functions do
--   2. Indexes: `idx_<table>_<columns>`
--   3. Policies: `<table>: admins can <operation>` and
--      `<table>: anyone can <operation>`
--   4. The comment of `videos`, which also holds Twitch videos
--
-- `audit_action` keeps `VIDEO_UPDATE`, which nothing records any more, and the
-- `CHANNEL_*` values, which the audit logs of talents use: Postgres cannot
-- remove a value from an enum.

-- ---------------------------------------------------------------------------
-- 1. `search_videos_v4` and `count_videos_v2`
--    The name of an argument cannot be changed with `CREATE OR REPLACE`, so
--    the functions are added under new names. They are the same as
--    `search_videos_v3` and `count_videos_v1`
--    (`20261118100000_page_only_linkable_videos_in_search_videos_v3.sql`)
--    except for the names of the arguments, which start with `p_` as in the
--    newer functions (e.g. `suggestions_v2`) so that they are not mistaken
--    for the columns. `search_videos_v3` and `count_videos_v1` are kept until
--    the deployed site stops calling them, as `search_videos_v2` was.
--
--    The functions run with the caller's rights, so the row-level security of
--    each table applies to the subqueries.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."search_videos_v4"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_perpage" bigint DEFAULT 20, "p_video_kinds" "public"."video_kind"[] DEFAULT NULL) RETURNS SETOF "public"."videos"
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT *
  FROM videos
  WHERE
    (p_query IS NULL OR p_query = '' OR videos.title &@~ pgroonga_query_expand('terms', 'synonyms', 'synonyms', '"' || p_query || '"')) AND
    (COALESCE(array_length(p_talent_ids, 1), 0) = 0 OR videos.talent_id = ANY(p_talent_ids)) AND
    (p_video_kinds IS NULL OR videos.video_kind = ANY(p_video_kinds)) AND
    videos.published_at < p_until AND
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
    p_perpage;
$$;
ALTER FUNCTION "public"."search_videos_v4"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_perpage" bigint, "p_video_kinds" "public"."video_kind"[]) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."count_videos_v2"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_video_kinds" "public"."video_kind"[] DEFAULT NULL) RETURNS bigint
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT count(*)
  FROM videos
  WHERE
    (p_query IS NULL OR p_query = '' OR videos.title &@~ pgroonga_query_expand('terms', 'synonyms', 'synonyms', '"' || p_query || '"')) AND
    (COALESCE(array_length(p_talent_ids, 1), 0) = 0 OR videos.talent_id = ANY(p_talent_ids)) AND
    (p_video_kinds IS NULL OR videos.video_kind = ANY(p_video_kinds)) AND
    videos.published_at < p_until AND
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
ALTER FUNCTION "public"."count_videos_v2"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_video_kinds" "public"."video_kind"[]) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."search_videos_v4"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_perpage" bigint, "p_video_kinds" "public"."video_kind"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."search_videos_v4"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_perpage" bigint, "p_video_kinds" "public"."video_kind"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_videos_v4"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_perpage" bigint, "p_video_kinds" "public"."video_kind"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."count_videos_v2"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_video_kinds" "public"."video_kind"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."count_videos_v2"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_video_kinds" "public"."video_kind"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_videos_v2"("p_query" "text", "p_until" timestamp with time zone, "p_talent_ids" "uuid"[], "p_video_kinds" "public"."video_kind"[]) TO "service_role";

-- ---------------------------------------------------------------------------
-- 2. Indexes: `idx_<table>_<columns>`
--    The key columns in order, without the sort order. A partial index adds
--    its condition only when another index has the same columns.
--    `supabase/tests/database/naming.test.sql` checks the names.
-- ---------------------------------------------------------------------------
ALTER INDEX "public"."ix_talents_status" RENAME TO "idx_talents_status";

ALTER INDEX "public"."idx_terms_popularity_desc" RENAME TO "idx_terms_popularity";
-- `terms` was once `synonyms`
ALTER INDEX "public"."ix_synonyms_term" RENAME TO "idx_terms_term";
ALTER INDEX "public"."pgroonga_terms_prefix_search" RENAME TO "idx_terms_readings";
ALTER INDEX "public"."terms_synonyms" RENAME TO "idx_terms_synonyms";

ALTER INDEX "public"."idx_twitch_users_login_name" RENAME TO "idx_twitch_users_twitch_login_name";

ALTER INDEX "public"."video_backfill_jobs_account_finished_at_idx" RENAME TO "idx_video_backfill_jobs_platform_account_id_finished_at";
ALTER INDEX "public"."video_backfill_jobs_finished_at_idx" RENAME TO "idx_video_backfill_jobs_finished_at";
ALTER INDEX "public"."video_backfill_jobs_talent_id_idx" RENAME TO "idx_video_backfill_jobs_talent_id";

ALTER INDEX "public"."idx_videos_published_at_desc" RENAME TO "idx_videos_published_at";
ALTER INDEX "public"."ix_videos_deleted_at" RENAME TO "idx_videos_deleted_at";
ALTER INDEX "public"."ix_videos_title" RENAME TO "idx_videos_title";
ALTER INDEX "public"."videos_visible_idx" RENAME TO "idx_videos_visible";
-- Two partial indexes on `talent_id`: the videos that are not deleted, and
-- the videos deleted with their talent
ALTER INDEX "public"."ix_videos_active_by_talent" RENAME TO "idx_videos_talent_id_not_deleted";
ALTER INDEX "public"."ix_videos_deleted_reason_talent_deleted" RENAME TO "idx_videos_talent_id_deleted_with_talent";

-- ---------------------------------------------------------------------------
-- 3. Policies
--    `<table>: admins can <operation>` for the policies of the admin app
--    (`authenticated` and `public.is_admin()`, since
--    `20261114130000_restrict_admin_policies_to_admin_role.sql`), and
--    `<table>: anyone can <operation>` for the others. The operation is
--    `read`, `insert`, `update`, `delete`, or `manage` for all of them.
--    `supabase/tests/database/naming.test.sql` checks the names.
-- ---------------------------------------------------------------------------
ALTER POLICY "Allow admin full access" ON "public"."announcements" RENAME TO "announcements: admins can manage";
ALTER POLICY "Allow public read access to enabled announcements" ON "public"."announcements" RENAME TO "announcements: anyone can read";

ALTER POLICY "Allow admins to read audit logs" ON "public"."audit_logs" RENAME TO "audit_logs: admins can read";

ALTER POLICY "Allow anyone to insert feature requests" ON "public"."feature_requests" RENAME TO "feature_requests: anyone can insert";
ALTER POLICY "Allow authenticated users to read all feature requests" ON "public"."feature_requests" RENAME TO "feature_requests: admins can read";
ALTER POLICY "Allow authenticated users to update all feature requests" ON "public"."feature_requests" RENAME TO "feature_requests: admins can update";

ALTER POLICY "Allow public read access to profile images in use" ON "public"."profile_images" RENAME TO "profile_images: anyone can read";
ALTER POLICY "Enable read access with unused profile images for authenticated" ON "public"."profile_images" RENAME TO "profile_images: admins can read";

ALTER POLICY "Allow public read access" ON "public"."talents" RENAME TO "talents: anyone can read";
ALTER POLICY "Enable read access with deleted contents for authenticated" ON "public"."talents" RENAME TO "talents: admins can read";
ALTER POLICY "Enable insert for authenticated users only" ON "public"."talents" RENAME TO "talents: admins can insert";
ALTER POLICY "Enable update for authenticated users only" ON "public"."talents" RENAME TO "talents: admins can update";

ALTER POLICY "Enable read access for all users" ON "public"."terms" RENAME TO "terms: anyone can read";
ALTER POLICY "Enable insert for authenticated users only" ON "public"."terms" RENAME TO "terms: admins can insert";
ALTER POLICY "Enable update for authenticated users only" ON "public"."terms" RENAME TO "terms: admins can update";
ALTER POLICY "Enable delete for authenticated users only" ON "public"."terms" RENAME TO "terms: admins can delete";

ALTER POLICY "Enable read access for all users" ON "public"."thumbnails" RENAME TO "thumbnails: anyone can read";
ALTER POLICY "Enable read access with deleted contents for authenticated " ON "public"."thumbnails" RENAME TO "thumbnails: admins can read";
ALTER POLICY "Enable update for authenticated users only" ON "public"."thumbnails" RENAME TO "thumbnails: admins can update";

ALTER POLICY "Allow public read access" ON "public"."twitch_users" RENAME TO "twitch_users: anyone can read";
ALTER POLICY "Enable insert for authenticated users" ON "public"."twitch_users" RENAME TO "twitch_users: admins can insert";
ALTER POLICY "Enable update for authenticated users" ON "public"."twitch_users" RENAME TO "twitch_users: admins can update";
ALTER POLICY "Enable delete for authenticated users" ON "public"."twitch_users" RENAME TO "twitch_users: admins can delete";

ALTER POLICY "Allow public read access" ON "public"."twitch_videos" RENAME TO "twitch_videos: anyone can read";
ALTER POLICY "Enable insert for authenticated users" ON "public"."twitch_videos" RENAME TO "twitch_videos: admins can insert";
ALTER POLICY "Enable update for authenticated users" ON "public"."twitch_videos" RENAME TO "twitch_videos: admins can update";
ALTER POLICY "Enable delete for authenticated users" ON "public"."twitch_videos" RENAME TO "twitch_videos: admins can delete";

ALTER POLICY "Enable read access for authenticated" ON "public"."video_backfill_jobs" RENAME TO "video_backfill_jobs: admins can read";

ALTER POLICY "Enable read access for all users" ON "public"."videos" RENAME TO "videos: anyone can read";
ALTER POLICY "Enable read access with deleted contents for authenticated " ON "public"."videos" RENAME TO "videos: admins can read";
ALTER POLICY "Enable update for authenticated users only" ON "public"."videos" RENAME TO "videos: admins can update";

ALTER POLICY "Allow public read access" ON "public"."youtube_channels" RENAME TO "youtube_channels: anyone can read";
ALTER POLICY "Enable insert for authenticated users" ON "public"."youtube_channels" RENAME TO "youtube_channels: admins can insert";
ALTER POLICY "Enable update for authenticated users" ON "public"."youtube_channels" RENAME TO "youtube_channels: admins can update";
ALTER POLICY "Enable delete for authenticated users" ON "public"."youtube_channels" RENAME TO "youtube_channels: admins can delete";

ALTER POLICY "Allow public read access" ON "public"."youtube_videos" RENAME TO "youtube_videos: anyone can read";
ALTER POLICY "Enable insert for authenticated users" ON "public"."youtube_videos" RENAME TO "youtube_videos: admins can insert";
ALTER POLICY "Enable update for authenticated users" ON "public"."youtube_videos" RENAME TO "youtube_videos: admins can update";
ALTER POLICY "Enable delete for authenticated users" ON "public"."youtube_videos" RENAME TO "youtube_videos: admins can delete";

-- ---------------------------------------------------------------------------
-- 4. The comment of `videos`
-- ---------------------------------------------------------------------------
COMMENT ON TABLE "public"."videos" IS 'YouTubeやTwitchの動画、ライブ配信、クリップ';
