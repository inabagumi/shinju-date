-- Audit action for changes to the status and the memo of a feedback from the admin app
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'FEATURE_REQUEST_UPDATE';
