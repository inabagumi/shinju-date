-- Audit action for requests to backfill past videos of a talent from the admin app
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'VIDEO_BACKFILL';
