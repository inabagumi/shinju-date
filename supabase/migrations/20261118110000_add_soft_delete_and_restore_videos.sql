-- Soft-deletes and restores videos together with their thumbnails (#7077).
--
-- The scraper (`unavailable`), the batch that cascades from the talents
-- (`talent_deleted`) and the admin app (`withdrawn`) used to update `videos`
-- and `thumbnails` with separate requests, so a failure between them could
-- leave a deleted video with its thumbnail (or the other way round). Each
-- function updates both tables in one statement, which runs in one
-- transaction.
--
-- `updated_at` is not set here: the `on_videos_update` and
-- `on_thumbnails_update` triggers set it on every update.
--
-- Both are SECURITY INVOKER, so the RLS of `videos` and `thumbnails` still
-- applies to the admin, and they check the role first so that a caller who
-- is neither an admin nor the service role gets an error instead of an empty
-- result.

-- ---------------------------------------------------------------------------
-- 1. soft_delete_videos
--    Only the videos that are not deleted yet are deleted, so the reason and
--    the time of a video deleted earlier (for example, `talent_deleted`) are
--    never overwritten. Returns the IDs of the videos this call deleted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."soft_delete_videos"(
    "p_video_ids" "uuid"[],
    "p_reason" "public"."video_deleted_reason",
    "p_deleted_at" timestamp with time zone
) RETURNS SETOF "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- auth.role() is NULL without a JWT, so compare with IS NOT DISTINCT FROM to
  -- keep the condition from becoming NULL (which IF treats as false).
  IF NOT ("public"."is_admin"() OR "auth"."role"() IS NOT DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'permission denied for function soft_delete_videos'
      USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR p_deleted_at IS NULL THEN
    RAISE EXCEPTION 'p_reason and p_deleted_at must not be NULL'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH "deleted_videos" AS (
    UPDATE "public"."videos"
    SET
      "deleted_at" = p_deleted_at,
      "deleted_reason" = p_reason
    WHERE "id" = ANY(p_video_ids)
      AND "deleted_at" IS NULL
    RETURNING "id", "thumbnail_id"
  ),
  "deleted_thumbnails" AS (
    UPDATE "public"."thumbnails"
    SET "deleted_at" = p_deleted_at
    WHERE "id" IN (SELECT "thumbnail_id" FROM "deleted_videos")
      AND "deleted_at" IS NULL
  )
  SELECT "deleted_videos"."id" FROM "deleted_videos" ORDER BY "deleted_videos"."id";
END;
$$;

ALTER FUNCTION "public"."soft_delete_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason", "p_deleted_at" timestamp with time zone) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."soft_delete_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason", "p_deleted_at" timestamp with time zone) IS 'Soft-deletes the given videos that are not deleted yet, with their thumbnails, and returns the IDs of the deleted videos. Only an admin or the service role may call it.';

REVOKE ALL ON FUNCTION "public"."soft_delete_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason", "p_deleted_at" timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."soft_delete_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason", "p_deleted_at" timestamp with time zone) FROM "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason", "p_deleted_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason", "p_deleted_at" timestamp with time zone) TO "service_role";

-- ---------------------------------------------------------------------------
-- 2. restore_videos
--    With p_reason, only the videos deleted for that reason are restored (the
--    batch restores `talent_deleted` only, so a video withdrawn by an admin
--    stays deleted when its talent comes back). With NULL, the deleted videos
--    are restored whatever the reason. Returns the IDs of the videos this
--    call restored.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."restore_videos"(
    "p_video_ids" "uuid"[],
    "p_reason" "public"."video_deleted_reason" DEFAULT NULL
) RETURNS SETOF "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT ("public"."is_admin"() OR "auth"."role"() IS NOT DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'permission denied for function restore_videos'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH "restored_videos" AS (
    UPDATE "public"."videos"
    SET
      "deleted_at" = NULL,
      "deleted_reason" = NULL
    WHERE "id" = ANY(p_video_ids)
      AND "deleted_at" IS NOT NULL
      AND (p_reason IS NULL OR "deleted_reason" = p_reason)
    RETURNING "id", "thumbnail_id"
  ),
  "restored_thumbnails" AS (
    UPDATE "public"."thumbnails"
    SET "deleted_at" = NULL
    WHERE "id" IN (SELECT "thumbnail_id" FROM "restored_videos")
      AND "deleted_at" IS NOT NULL
  )
  SELECT "restored_videos"."id" FROM "restored_videos" ORDER BY "restored_videos"."id";
END;
$$;

ALTER FUNCTION "public"."restore_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."restore_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason") IS 'Restores the given deleted videos (only those deleted for p_reason unless it is NULL), with their thumbnails, and returns the IDs of the restored videos. Only an admin or the service role may call it.';

REVOKE ALL ON FUNCTION "public"."restore_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."restore_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason") FROM "anon";
GRANT ALL ON FUNCTION "public"."restore_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_videos"("p_video_ids" "uuid"[], "p_reason" "public"."video_deleted_reason") TO "service_role";
