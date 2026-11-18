-- Leaves `updated_at` to the triggers (#7079).
--
-- The `handle_updated_at` trigger sets `updated_at` to the current time of
-- the database (truncated to the second) on every update of `videos`,
-- `thumbnails`, `terms`, `announcements`, `feature_requests` and
-- `profile_images`, so the values the apps wrote on updates were never
-- stored. The apps stop writing them, and this migration makes the tables
-- consistent:
--
-- 1. `talents` gets the same trigger.
-- 2. `touch_talent` and `touch_thumbnail` move `updated_at` of a row without
--    changing anything else, for the apps that only need the trigger to run
--    (an account of a talent was added or synced, a thumbnail stopped being
--    used).
-- 3. The defaults of `created_at` and `updated_at` become
--    `date_trunc('second', now())` everywhere. `now() AT TIME ZONE 'utc'` and
--    `timezone('utc', now())` made a time without a time zone, which was only
--    the right moment while the time zone of the connection was UTC. The
--    values of the existing rows do not change.
-- 4. `created_at` and `updated_at` of `announcements` become `NOT NULL`.

-- ---------------------------------------------------------------------------
-- 1. The trigger of talents
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER "on_talents_update"
    BEFORE UPDATE ON "public"."talents"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

-- ---------------------------------------------------------------------------
-- 2. touch_talent and touch_thumbnail
--    `SET "updated_at" = "updated_at"` changes nothing by itself; the trigger
--    sets the current time. Both are SECURITY INVOKER, so the RLS of the
--    tables still applies to the admin, and they check the role first so that
--    a caller who is neither an admin nor the service role gets an error
--    instead of updating nothing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."touch_talent"("p_talent_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- auth.role() is NULL without a JWT, so compare with IS NOT DISTINCT FROM to
  -- keep the condition from becoming NULL (which IF treats as false).
  IF NOT ("public"."is_admin"() OR "auth"."role"() IS NOT DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'permission denied for function touch_talent'
      USING ERRCODE = '42501';
  END IF;

  UPDATE "public"."talents"
  SET "updated_at" = "updated_at"
  WHERE "id" = p_talent_id;
END;
$$;

ALTER FUNCTION "public"."touch_talent"("p_talent_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."touch_talent"("p_talent_id" "uuid") IS 'Moves updated_at of the talent to the current time (the trigger sets it) without changing anything else. Only an admin or the service role may call it.';

REVOKE ALL ON FUNCTION "public"."touch_talent"("p_talent_id" "uuid") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."touch_talent"("p_talent_id" "uuid") FROM "anon";
GRANT ALL ON FUNCTION "public"."touch_talent"("p_talent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_talent"("p_talent_id" "uuid") TO "service_role";

CREATE OR REPLACE FUNCTION "public"."touch_thumbnail"("p_thumbnail_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- auth.role() is NULL without a JWT, so compare with IS NOT DISTINCT FROM to
  -- keep the condition from becoming NULL (which IF treats as false).
  IF NOT ("public"."is_admin"() OR "auth"."role"() IS NOT DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'permission denied for function touch_thumbnail'
      USING ERRCODE = '42501';
  END IF;

  UPDATE "public"."thumbnails"
  SET "updated_at" = "updated_at"
  WHERE "id" = p_thumbnail_id;
END;
$$;

ALTER FUNCTION "public"."touch_thumbnail"("p_thumbnail_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."touch_thumbnail"("p_thumbnail_id" "uuid") IS 'Moves updated_at of the thumbnail to the current time (the trigger sets it) without changing anything else. Only an admin or the service role may call it.';

REVOKE ALL ON FUNCTION "public"."touch_thumbnail"("p_thumbnail_id" "uuid") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."touch_thumbnail"("p_thumbnail_id" "uuid") FROM "anon";
GRANT ALL ON FUNCTION "public"."touch_thumbnail"("p_thumbnail_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_thumbnail"("p_thumbnail_id" "uuid") TO "service_role";

-- ---------------------------------------------------------------------------
-- 3. The defaults of created_at and updated_at
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."announcements"
    ALTER COLUMN "created_at" SET DEFAULT date_trunc('second', now()),
    ALTER COLUMN "updated_at" SET DEFAULT date_trunc('second', now());

ALTER TABLE "public"."audit_logs"
    ALTER COLUMN "created_at" SET DEFAULT date_trunc('second', now());

ALTER TABLE "public"."feature_requests"
    ALTER COLUMN "created_at" SET DEFAULT date_trunc('second', now()),
    ALTER COLUMN "updated_at" SET DEFAULT date_trunc('second', now());

ALTER TABLE "public"."profile_images"
    ALTER COLUMN "created_at" SET DEFAULT date_trunc('second', now()),
    ALTER COLUMN "updated_at" SET DEFAULT date_trunc('second', now());

ALTER TABLE "public"."talents"
    ALTER COLUMN "created_at" SET DEFAULT date_trunc('second', now()),
    ALTER COLUMN "updated_at" SET DEFAULT date_trunc('second', now());

ALTER TABLE "public"."terms"
    ALTER COLUMN "created_at" SET DEFAULT date_trunc('second', now()),
    ALTER COLUMN "updated_at" SET DEFAULT date_trunc('second', now());

ALTER TABLE "public"."thumbnails"
    ALTER COLUMN "created_at" SET DEFAULT date_trunc('second', now()),
    ALTER COLUMN "updated_at" SET DEFAULT date_trunc('second', now());

ALTER TABLE "public"."video_backfill_jobs"
    ALTER COLUMN "created_at" SET DEFAULT date_trunc('second', now());

ALTER TABLE "public"."videos"
    ALTER COLUMN "created_at" SET DEFAULT date_trunc('second', now()),
    ALTER COLUMN "updated_at" SET DEFAULT date_trunc('second', now());

-- ---------------------------------------------------------------------------
-- 4. NOT NULL of announcements
--    Fills the missing times first. Disables the trigger meanwhile, so that
--    filling `created_at` of a row does not move its `updated_at`.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."announcements" DISABLE TRIGGER "on_announcements_update";

UPDATE "public"."announcements"
SET
    "created_at" = COALESCE("created_at", date_trunc('second', now())),
    "updated_at" = COALESCE("updated_at", date_trunc('second', now()))
WHERE "created_at" IS NULL OR "updated_at" IS NULL;

ALTER TABLE "public"."announcements" ENABLE TRIGGER "on_announcements_update";

ALTER TABLE "public"."announcements"
    ALTER COLUMN "created_at" SET NOT NULL,
    ALTER COLUMN "updated_at" SET NOT NULL;
