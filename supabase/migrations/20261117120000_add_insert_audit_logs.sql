-- Records several audit log entries with one call, for the bulk actions of the
-- admin app (#7015). Each element of p_entries is an object with the columns
-- that insert_audit_log takes:
--   {"action": ..., "target_table": ..., "target_record_id": ..., "details": ...}
-- Like insert_audit_log, it records the user who calls it, and only an admin
-- (or the service role) may call it.
CREATE OR REPLACE FUNCTION "public"."insert_audit_logs"("p_entries" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- auth.role() is NULL without a JWT, so compare with IS NOT DISTINCT FROM to
  -- keep the condition from becoming NULL (which IF treats as false).
  IF NOT ("public"."is_admin"() OR "auth"."role"() IS NOT DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'permission denied for function insert_audit_logs'
      USING ERRCODE = '42501';
  END IF;

  IF "jsonb_typeof"(p_entries) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_entries must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    action,
    target_table,
    target_record_id,
    details
  )
  SELECT
    auth.uid(),
    (entry ->> 'action')::"public"."audit_action",
    entry ->> 'target_table',
    (entry ->> 'target_record_id')::"uuid",
    -- A JSON null is stored as NULL, as insert_audit_log stores it.
    NULLIF(entry -> 'details', 'null'::"jsonb")
  FROM "jsonb_array_elements"(p_entries) WITH ORDINALITY AS entries(entry, position)
  ORDER BY position;
END;
$$;

ALTER FUNCTION "public"."insert_audit_logs"("p_entries" "jsonb") OWNER TO "postgres";

-- The function bypasses the RLS of audit_logs, so GRANT is the security
-- boundary: anon must not write audit logs.
REVOKE ALL ON FUNCTION "public"."insert_audit_logs"("p_entries" "jsonb") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."insert_audit_logs"("p_entries" "jsonb") FROM "anon";
GRANT ALL ON FUNCTION "public"."insert_audit_logs"("p_entries" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_audit_logs"("p_entries" "jsonb") TO "service_role";
