-- Inserts a video together with its platform row in one transaction (#7078).
--
-- A new video is saved as two rows: the `videos` row and the row of its
-- platform (`youtube_videos` or `twitch_videos`). The scraper used to insert
-- them with two requests and delete the `videos` row again when the second
-- insert failed. When the run stopped between the two (the time limit, a
-- deployment), or the delete failed, the `videos` row was left without its
-- platform row: it can never be matched to its source, so nothing reviews or
-- removes it.

-- ---------------------------------------------------------------------------
-- 1. insert_video
--    Inserts the `videos` row and the platform row in one statement, which
--    runs in one transaction. When the platform row breaks a unique
--    constraint of its table (another run saved the video first), nothing is
--    inserted and NULL is returned. Returns the ID of the new video
--    otherwise.
--
--    The columns are the keys of the JSON objects, so the columns that are
--    left out get their defaults, as an insert through PostgREST does. A key
--    that is not a column is an error. The function sets `videos.id`,
--    `videos.platform` and the `video_id` of the platform row, and the
--    platform row gets the default `id`.
--
--    Only the service role (the scraper) may call it. It is SECURITY
--    INVOKER, so it can do no more than the caller can.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."insert_video"(
    "p_video" "jsonb",
    "p_platform" "public"."platform_type",
    "p_platform_video" "jsonb"
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_video_id uuid := gen_random_uuid();
  v_platform_table text;
  v_video jsonb;
  v_platform_video jsonb;
  v_video_columns text;
  v_platform_columns text;
  v_violated_table text;
BEGIN
  IF p_platform IS NULL
    OR jsonb_typeof(p_video) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_platform_video) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'p_platform must not be NULL, and p_video and p_platform_video must be objects'
      USING ERRCODE = '22023';
  END IF;

  IF p_video ? 'platform' AND p_video ->> 'platform' IS DISTINCT FROM p_platform::text THEN
    RAISE EXCEPTION 'the platform of p_video (%) differs from p_platform (%)',
      p_video ->> 'platform', p_platform
      USING ERRCODE = '22023';
  END IF;

  v_platform_table := CASE p_platform
    WHEN 'youtube' THEN 'youtube_videos'
    WHEN 'twitch' THEN 'twitch_videos'
  END;

  v_video := (p_video - 'id')
    || jsonb_build_object('id', v_video_id, 'platform', p_platform);
  v_platform_video := (p_platform_video - 'id' - 'video_id')
    || jsonb_build_object('video_id', v_video_id);

  SELECT string_agg(quote_ident("key"), ', ')
  INTO v_video_columns
  FROM jsonb_object_keys(v_video) AS "key";

  SELECT string_agg(quote_ident("key"), ', ')
  INTO v_platform_columns
  FROM jsonb_object_keys(v_platform_video) AS "key";

  -- The block runs in a subtransaction, so a unique violation of the platform
  -- row undoes the `videos` row too. Any other error fails the whole call.
  BEGIN
    EXECUTE format(
      'INSERT INTO "public"."videos" (%1$s) SELECT %1$s FROM jsonb_populate_record(NULL::"public"."videos", $1)',
      v_video_columns
    ) USING v_video;

    EXECUTE format(
      'INSERT INTO "public".%1$I (%2$s) SELECT %2$s FROM jsonb_populate_record(NULL::"public".%1$I, $1)',
      v_platform_table,
      v_platform_columns
    ) USING v_platform_video;
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_violated_table = TABLE_NAME;

      IF v_violated_table = v_platform_table THEN
        RETURN NULL;
      END IF;

      RAISE;
  END;

  RETURN v_video_id;
END;
$$;

ALTER FUNCTION "public"."insert_video"("p_video" "jsonb", "p_platform" "public"."platform_type", "p_platform_video" "jsonb") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."insert_video"("p_video" "jsonb", "p_platform" "public"."platform_type", "p_platform_video" "jsonb") IS 'Inserts a video with its platform row (youtube_videos or twitch_videos) in one transaction and returns its ID, or NULL without inserting anything when the platform video already exists. Only the service role may call it.';

REVOKE ALL ON FUNCTION "public"."insert_video"("p_video" "jsonb", "p_platform" "public"."platform_type", "p_platform_video" "jsonb") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."insert_video"("p_video" "jsonb", "p_platform" "public"."platform_type", "p_platform_video" "jsonb") FROM "anon";
REVOKE ALL ON FUNCTION "public"."insert_video"("p_video" "jsonb", "p_platform" "public"."platform_type", "p_platform_video" "jsonb") FROM "authenticated";
GRANT ALL ON FUNCTION "public"."insert_video"("p_video" "jsonb", "p_platform" "public"."platform_type", "p_platform_video" "jsonb") TO "service_role";

-- ---------------------------------------------------------------------------
-- 2. Soft-delete the videos left without their platform rows
--    They can never be matched to their sources and the site does not show
--    them, so they are deleted as `unavailable`, with their thumbnails, like
--    `soft_delete_videos` does. The videos of the last hour are left alone,
--    so that a run of the scraper that is between its two inserts while this
--    migration is applied keeps its video.
-- ---------------------------------------------------------------------------
WITH "deleted_videos" AS (
  UPDATE "public"."videos" AS "v"
  SET
    "deleted_at" = now(),
    "deleted_reason" = 'unavailable'
  WHERE "v"."deleted_at" IS NULL
    AND "v"."created_at" < now() - interval '1 hour'
    AND NOT EXISTS (
      SELECT 1 FROM "public"."youtube_videos" AS "y" WHERE "y"."video_id" = "v"."id"
    )
    AND NOT EXISTS (
      SELECT 1 FROM "public"."twitch_videos" AS "t" WHERE "t"."video_id" = "v"."id"
    )
  RETURNING "v"."thumbnail_id"
)
UPDATE "public"."thumbnails"
SET "deleted_at" = now()
WHERE "id" IN (SELECT "thumbnail_id" FROM "deleted_videos")
  AND "deleted_at" IS NULL;
