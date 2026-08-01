-- Tightens access to SECURITY DEFINER audit log RPCs.
-- These functions bypass table RLS, so GRANT is the effective security boundary.
-- Admin app only needs authenticated; anon must not read or write audit logs.

REVOKE ALL ON FUNCTION "public"."get_audit_logs"(
    "p_limit" integer,
    "p_offset" integer,
    "p_sort_by" "text",
    "p_sort_direction" "text"
) FROM "anon";

REVOKE ALL ON FUNCTION "public"."insert_audit_log"(
    "p_action" "public"."audit_action",
    "p_target_table" "text",
    "p_target_record_id" "uuid",
    "p_details" "jsonb"
) FROM "anon";
