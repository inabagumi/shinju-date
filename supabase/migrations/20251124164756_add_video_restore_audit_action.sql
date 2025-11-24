-- Add VIDEO_RESTORE to audit_action enum
-- This allows tracking of video restoration operations in audit logs

ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'VIDEO_RESTORE';
