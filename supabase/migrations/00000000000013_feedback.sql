-- Feedback table and related types

-- Create ENUM for feedback status
CREATE TYPE "public"."feedback_status" AS ENUM (
    'pending',
    'in_progress',
    'resolved',
    'rejected'
);
ALTER TYPE "public"."feedback_status" OWNER TO "postgres";

-- Create feedback table
CREATE TABLE "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "type" "text" NOT NULL,
    "name" "text",
    "email" "text",
    "message" "text" NOT NULL,
    "wants_reply" boolean DEFAULT false NOT NULL,
    "status" "public"."feedback_status" DEFAULT 'pending' NOT NULL,
    "admin_memo" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT (date_trunc('second', NOW())) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT (date_trunc('second', NOW())) NOT NULL
);
ALTER TABLE "public"."feedback" OWNER TO "postgres";

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER "on_feedback_update"
    BEFORE UPDATE ON "public"."feedback"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."handle_updated_at"();

-- Enable RLS
ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to insert feedback (public submission)
CREATE POLICY "Allow anyone to insert feedback"
    ON "public"."feedback"
    FOR INSERT
    TO "anon", "authenticated"
    WITH CHECK (true);

-- Allow authenticated users (admins) to read all feedback
CREATE POLICY "Allow authenticated users to read all feedback"
    ON "public"."feedback"
    FOR SELECT
    TO "authenticated"
    USING (true);

-- Allow authenticated users (admins) to update all feedback
CREATE POLICY "Allow authenticated users to update all feedback"
    ON "public"."feedback"
    FOR UPDATE
    TO "authenticated"
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."feedback" TO "anon";
GRANT SELECT, INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."feedback" TO "authenticated";
GRANT SELECT, INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."feedback" TO "service_role";
