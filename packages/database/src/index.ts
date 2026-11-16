import type { Enums } from '../types/supabase.js'

export type {
  Database as default,
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '../types/supabase.js'
export { Constants } from '../types/supabase.js'

export type AuditAction = Enums<'audit_action'>
export type FeatureRequestStatus = Enums<'feature_request_status'>
export type Platform = Enums<'platform_type'>
export type TalentStatus = Enums<'talent_status'>
export type TwitchVideoType = Enums<'twitch_video_type'>
export type VideoBackfillJobStatus = Enums<'video_backfill_job_status'>
export type VideoDeletedReason = Enums<'video_deleted_reason'>
export type VideoKind = Enums<'video_kind'>
export type VideoStatus = Enums<'video_status'>
