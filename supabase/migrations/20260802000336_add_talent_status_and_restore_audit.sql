-- Add talent_status enum and status column for active/retired
-- Add audit actions for restore, retire, and activate

CREATE TYPE "public"."talent_status" AS ENUM (
    'active',
    'retired'
);

ALTER TYPE "public"."talent_status" OWNER TO "postgres";

ALTER TABLE "public"."talents"
    ADD COLUMN "status" "public"."talent_status" DEFAULT 'active'::"public"."talent_status" NOT NULL;

-- Partial index for common admin/batch filters (non-deleted rows by status)
CREATE INDEX "ix_talents_status" ON "public"."talents" USING "btree" ("status")
    WHERE "deleted_at" IS NULL;

COMMENT ON COLUMN "public"."talents"."status" IS 'Public-facing lifecycle status (active/retired). Soft-delete uses deleted_at separately.';

ALTER TYPE "public"."audit_action" ADD VALUE 'CHANNEL_RESTORE';
ALTER TYPE "public"."audit_action" ADD VALUE 'CHANNEL_RETIRE';
ALTER TYPE "public"."audit_action" ADD VALUE 'CHANNEL_ACTIVATE';
