-- audit_logs テーブル定義と関連関数

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "public"."audit_action" NOT NULL,
    "target_table" "text",
    "target_record_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."audit_logs" OWNER TO "postgres";

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

-- 関連関数
CREATE OR REPLACE FUNCTION "public"."get_audit_logs"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_sort_by" "text" DEFAULT 'created_at'::"text", "p_sort_direction" "text" DEFAULT 'desc'::"text") RETURNS TABLE("id" "uuid", "user_id" "uuid", "user_email" "text", "action" "public"."audit_action", "target_table" "text", "target_record_id" "uuid", "details" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
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

ALTER FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_sort_by" "text", "p_sort_direction" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."insert_audit_log"("p_action" "public"."audit_action", "p_target_table" "text", "p_target_record_id" "uuid" DEFAULT NULL::"uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
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

ALTER FUNCTION "public"."insert_audit_log"("p_action" "public"."audit_action", "p_target_table" "text", "p_target_record_id" "uuid", "p_details" "jsonb") OWNER TO "postgres";
