-- Create ENUM for feature request status
CREATE TYPE "public"."feature_request_status" AS ENUM (
    'pending',
    'in_progress',
    'resolved',
    'rejected'
);
ALTER TYPE "public"."feature_request_status" OWNER TO "postgres";

-- Create feature_requests table
CREATE TABLE "public"."feature_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "message" "text" NOT NULL,
    "status" "public"."feature_request_status" DEFAULT 'pending' NOT NULL,
    "admin_memo" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT (date_trunc('second', NOW())) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT (date_trunc('second', NOW())) NOT NULL
);
ALTER TABLE "public"."feature_requests" OWNER TO "postgres";

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER "on_feature_requests_update"
    BEFORE UPDATE ON "public"."feature_requests"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."handle_updated_at"();

-- Enable RLS
ALTER TABLE "public"."feature_requests" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to insert feature requests (public submission)
CREATE POLICY "Allow anyone to insert feature requests"
    ON "public"."feature_requests"
    FOR INSERT
    TO "anon", "authenticated"
    WITH CHECK (true);

-- Allow authenticated users (admins) to read all feature requests
CREATE POLICY "Allow authenticated users to read all feature requests"
    ON "public"."feature_requests"
    FOR SELECT
    TO "authenticated"
    USING (true);

-- Allow authenticated users (admins) to update all feature requests
CREATE POLICY "Allow authenticated users to update all feature requests"
    ON "public"."feature_requests"
    FOR UPDATE
    TO "authenticated"
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."feature_requests" TO "anon";
GRANT SELECT, INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."feature_requests" TO "authenticated";
GRANT SELECT, INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."feature_requests" TO "service_role";
