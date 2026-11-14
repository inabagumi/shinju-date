-- Restricts admin access to users who hold the admin role (#6473).
--
-- Until now every policy for the admin app was written for the
-- `authenticated` role, on the assumption that only admins can sign in. That
-- assumption is not enforced by the database: any user who can sign in to
-- Supabase Auth (e.g. if sign-ups are left open, or another client starts
-- using Supabase Auth) could read deleted rows and write every admin table.
--
-- Restricting only the SELECT of deleted rows would not help, because the same
-- users could restore a row by updating `deleted_at`. So every admin policy now
-- checks `public.is_admin()` instead of trusting `authenticated` alone.
--
--   1. public.is_admin(): whether the caller holds the admin role
--   2. Grant the admin role to the existing users (keeps today's behaviour)
--   3. Policies: `authenticated` -> admins only
--   4. SECURITY DEFINER audit log RPCs: admins (or the service role) only
--
-- To grant the admin role to a user, set `app_metadata.role` to `admin` with
-- the service role (e.g. `supabase.auth.admin.updateUserById(id, {
-- app_metadata: { role: 'admin' } })`) or with SQL on `auth.users`. Users
-- cannot change their own `app_metadata`.

-- ---------------------------------------------------------------------------
-- 1. public.is_admin()
--    Reads `auth.users` instead of the JWT so that granting or revoking the
--    role takes effect immediately, not when the access token is refreshed.
--    Banned and deleted users are not admins even while their token is valid.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE(
    (
      SELECT ("u"."raw_app_meta_data" ->> 'role') = 'admin'
      FROM "auth"."users" AS "u"
      WHERE "u"."id" = "auth"."uid"()
        AND "u"."deleted_at" IS NULL
        AND ("u"."banned_until" IS NULL OR "u"."banned_until" <= NOW())
    ),
    false
  );
$$;

ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."is_admin"() IS
    'Whether the current user holds the admin role (app_metadata.role = ''admin'').';

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."is_admin"() FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "service_role";

-- ---------------------------------------------------------------------------
-- 2. Existing users
--    Everyone who can sign in today uses the admin app, so they keep access.
--    Review the users after applying this migration and remove the role from
--    anyone who should not be an admin.
-- ---------------------------------------------------------------------------
UPDATE "auth"."users"
SET "raw_app_meta_data" = COALESCE("raw_app_meta_data", '{}'::"jsonb") || '{"role": "admin"}'::"jsonb"
WHERE "is_anonymous" IS NOT TRUE
  AND ("raw_app_meta_data" ->> 'role') IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Policies
--    `(SELECT ...)` lets Postgres evaluate is_admin() once per statement
--    instead of once per row.
-- ---------------------------------------------------------------------------

-- announcements: admins manage every announcement
ALTER POLICY "Allow admin full access" ON "public"."announcements"
    TO "authenticated"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));

-- audit_logs
ALTER POLICY "Allow admins to read audit logs" ON "public"."audit_logs"
    TO "authenticated"
    USING ((SELECT "public"."is_admin"()));

-- feature_requests (anyone may still submit one)
ALTER POLICY "Allow authenticated users to read all feature requests" ON "public"."feature_requests"
    USING ((SELECT "public"."is_admin"()));
ALTER POLICY "Allow authenticated users to update all feature requests" ON "public"."feature_requests"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));

-- profile_images
ALTER POLICY "Enable read access with unused profile images for authenticated" ON "public"."profile_images"
    USING ((SELECT "public"."is_admin"()));

-- talents
ALTER POLICY "Enable read access with deleted contents for authenticated" ON "public"."talents"
    USING ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable insert for authenticated users only" ON "public"."talents"
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable update for authenticated users only" ON "public"."talents"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));

-- terms
ALTER POLICY "Enable insert for authenticated users only" ON "public"."terms"
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable update for authenticated users only" ON "public"."terms"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable delete for authenticated users only" ON "public"."terms"
    USING ((SELECT "public"."is_admin"()));

-- thumbnails (the policy name ends with a space)
ALTER POLICY "Enable read access with deleted contents for authenticated " ON "public"."thumbnails"
    USING ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable update for authenticated users only" ON "public"."thumbnails"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));

-- twitch_users
ALTER POLICY "Enable insert for authenticated users" ON "public"."twitch_users"
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable update for authenticated users" ON "public"."twitch_users"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable delete for authenticated users" ON "public"."twitch_users"
    USING ((SELECT "public"."is_admin"()));

-- twitch_videos
ALTER POLICY "Enable insert for authenticated users" ON "public"."twitch_videos"
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable update for authenticated users" ON "public"."twitch_videos"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable delete for authenticated users" ON "public"."twitch_videos"
    USING ((SELECT "public"."is_admin"()));

-- video_backfill_jobs
ALTER POLICY "Enable read access for authenticated" ON "public"."video_backfill_jobs"
    USING ((SELECT "public"."is_admin"()));

-- videos (the policy name ends with a space)
ALTER POLICY "Enable read access with deleted contents for authenticated " ON "public"."videos"
    USING ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable update for authenticated users only" ON "public"."videos"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));

-- youtube_channels
ALTER POLICY "Enable insert for authenticated users" ON "public"."youtube_channels"
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable update for authenticated users" ON "public"."youtube_channels"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable delete for authenticated users" ON "public"."youtube_channels"
    USING ((SELECT "public"."is_admin"()));

-- youtube_videos
ALTER POLICY "Enable insert for authenticated users" ON "public"."youtube_videos"
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable update for authenticated users" ON "public"."youtube_videos"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));
ALTER POLICY "Enable delete for authenticated users" ON "public"."youtube_videos"
    USING ((SELECT "public"."is_admin"()));

-- ---------------------------------------------------------------------------
-- 4. Audit log RPCs
--    These bypass RLS, so they check the role themselves. The bodies are the
--    same as before apart from the check and a fixed search_path.
--    EXECUTE was still granted to PUBLIC (and so to anon through PUBLIC), so it
--    is revoked here as well.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."get_audit_logs"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_sort_by" "text" DEFAULT 'created_at'::"text", "p_sort_direction" "text" DEFAULT 'desc'::"text") RETURNS TABLE("id" "uuid", "user_id" "uuid", "user_email" "text", "action" "public"."audit_action", "target_table" "text", "target_record_id" "uuid", "details" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- auth.role() is NULL without a JWT, so compare with IS NOT DISTINCT FROM to
  -- keep the condition from becoming NULL (which IF treats as false).
  IF NOT ("public"."is_admin"() OR "auth"."role"() IS NOT DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'permission denied for function get_audit_logs'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      al.id,
      al.user_id,
      u.email::TEXT AS user_email,
      al.action,
      al.target_table,
      al.target_record_id,
      al.details,
      al.created_at
    FROM
      public.audit_logs AS al
      LEFT JOIN auth.users AS u ON al.user_id = u.id
    ORDER BY
      CASE WHEN p_sort_by = 'created_at' AND p_sort_direction = 'asc' THEN al.created_at END ASC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_direction = 'desc' THEN al.created_at END DESC,
      CASE WHEN p_sort_by = 'user_email' AND p_sort_direction = 'asc' THEN u.email END ASC,
      CASE WHEN p_sort_by = 'user_email' AND p_sort_direction = 'desc' THEN u.email END DESC,
      al.created_at DESC
    LIMIT
      p_limit
    OFFSET
      p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."insert_audit_log"("p_action" "public"."audit_action", "p_target_table" "text", "p_target_record_id" "uuid" DEFAULT NULL::"uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- auth.role() is NULL without a JWT, so compare with IS NOT DISTINCT FROM to
  -- keep the condition from becoming NULL (which IF treats as false).
  IF NOT ("public"."is_admin"() OR "auth"."role"() IS NOT DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'permission denied for function insert_audit_log'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    action,
    target_table,
    target_record_id,
    details
  )
  VALUES (
    auth.uid(),
    p_action,
    p_target_table,
    p_target_record_id,
    p_details
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_sort_by" "text", "p_sort_direction" "text") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."insert_audit_log"("p_action" "public"."audit_action", "p_target_table" "text", "p_target_record_id" "uuid", "p_details" "jsonb") FROM PUBLIC;
