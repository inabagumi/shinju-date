import type { default as Database, Enums, Tables } from '@shinju-date/database'
import type { AccountChanges } from '@shinju-date/scraper'
import { createSupabaseServerClient } from '@/lib/supabase'

export type AuditAction = Enums<'audit_action'>

type AuditLogJson = Exclude<
  Database['public']['Functions']['insert_audit_log']['Args']['p_details'],
  undefined
>

/** Values of `audit_logs.target_table`: what an audit log entry is about. */
export const AUDIT_TARGET_TABLES = {
  ANNOUNCEMENTS: 'announcements',
  AUTH_USERS: 'auth.users',
  /** The former name of `talents`, still used by some actions. */
  CHANNELS: 'channels',
  RECOMMENDED_QUERIES: 'redis:recommended_queries',
  SYSTEM: 'redis:system',
  TALENTS: 'talents',
  TERMS: 'terms',
  TWITCH_USERS: 'twitch_users',
  VIDEO_BACKFILL: 'redis:video-backfill',
  VIDEOS: 'videos',
  YOUTUBE_CHANNELS: 'youtube_channels',
} as const

export type AuditTargetTable =
  (typeof AUDIT_TARGET_TABLES)[keyof typeof AUDIT_TARGET_TABLES]

/** The name of the record, shown in the activity log instead of its ID. */
export interface EntityRef {
  entityName: string
}

/** The columns that changed, with their values before and after. */
export interface EntityChanges<T> extends EntityRef {
  changes: {
    after: Partial<T>
    before: Partial<T>
  }
}

/** The `videos` columns that syncing a video can change. */
export type VideoSyncFields = Pick<
  Tables<'videos'>,
  | 'deleted_at'
  | 'deleted_reason'
  | 'duration'
  | 'published_at'
  | 'status'
  | 'title'
  | 'video_kind'
>

export interface AccountEmailUpdateDetails extends EntityRef {
  /** The old address is not known when the change is confirmed. */
  changes: {
    after: { email: string }
  }
}

/** An account of a talent that changed when the talent was synced. */
export interface TalentSyncAccount {
  /** The values before and after, when the name or handle changed. */
  changes?: AccountChanges
  /** Present only when the stored icon was created, replaced or removed. */
  iconUpdated?: boolean
  /** Primary key of the account row (`youtube_channels` / `twitch_users`). */
  id: string
  name: string | null
}

export interface TalentSyncDetails extends EntityRef {
  accounts: TalentSyncAccount[]
  platform: Enums<'platform_type'>
}

/** Backfill of the accounts of one talent on one platform. */
export interface TalentVideoBackfillDetails extends EntityRef {
  accounts: { accountId: string; name: string }[]
  platform: Enums<'platform_type'>
}

interface VideoBackfillRequestDetails extends EntityRef {
  /** Accounts that could not be queued because of an error. */
  failed: number
  /** Accounts left out because they were being backfilled already. */
  skipped: number
}

/** A check of all talents for videos that are not saved. */
export interface VideoBackfillRunDetails extends VideoBackfillRequestDetails {
  /** Accounts that were queued. */
  accounts: number
  scope: 'all'
  /** Accounts of active talents, by platform. */
  targets: Record<Enums<'platform_type'>, number>
}

/** A retry of the backfills that failed. */
export interface VideoBackfillRetryDetails extends VideoBackfillRequestDetails {
  accounts: {
    accountId: string
    name: string
    provider: Enums<'platform_type'>
    talentId: string
  }[]
  scope: 'retry'
}

/**
 * What each audit action is about (`target`) and what it records in
 * `details`. `details: undefined` means that the action records no details.
 */
interface AuditLogDefinitions {
  ACCOUNT_EMAIL_UPDATE: {
    details: AccountEmailUpdateDetails
    target: typeof AUDIT_TARGET_TABLES.AUTH_USERS
  }
  ACCOUNT_PASSWORD_UPDATE: {
    details: undefined
    target: typeof AUDIT_TARGET_TABLES.AUTH_USERS
  }
  ANNOUNCEMENT_CREATE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.ANNOUNCEMENTS
  }
  ANNOUNCEMENT_DELETE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.ANNOUNCEMENTS
  }
  ANNOUNCEMENT_UPDATE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.ANNOUNCEMENTS
  }
  CHANNEL_ACTIVATE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.CHANNELS
  }
  CHANNEL_CREATE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.CHANNELS
  }
  CHANNEL_DELETE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.CHANNELS
  }
  CHANNEL_RESTORE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.CHANNELS
  }
  CHANNEL_RETIRE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.CHANNELS
  }
  CHANNEL_SYNC: {
    details: TalentSyncDetails
    target: typeof AUDIT_TARGET_TABLES.TALENTS
  }
  CHANNEL_UPDATE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.CHANNELS
  }
  MAINTENANCE_MODE_DISABLE: {
    details: undefined
    target: typeof AUDIT_TARGET_TABLES.SYSTEM
  }
  MAINTENANCE_MODE_ENABLE: {
    details: undefined
    target: typeof AUDIT_TARGET_TABLES.SYSTEM
  }
  RECOMMENDED_QUERY_CREATE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.RECOMMENDED_QUERIES
  }
  RECOMMENDED_QUERY_DELETE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.RECOMMENDED_QUERIES
  }
  TERM_CREATE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.TERMS
  }
  TERM_DELETE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.TERMS
  }
  TERM_UPDATE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.TERMS
  }
  TWITCH_USER_CREATE: {
    details: Pick<
      Tables<'twitch_users'>,
      'name' | 'talent_id' | 'twitch_login_name' | 'twitch_user_id'
    >
    target: typeof AUDIT_TARGET_TABLES.TWITCH_USERS
  }
  TWITCH_USER_DELETE: {
    details: Pick<
      Tables<'twitch_users'>,
      'talent_id' | 'twitch_login_name' | 'twitch_user_id'
    >
    target: typeof AUDIT_TARGET_TABLES.TWITCH_USERS
  }
  VIDEO_BACKFILL:
    | {
        details: TalentVideoBackfillDetails
        target: typeof AUDIT_TARGET_TABLES.CHANNELS
      }
    | {
        details: VideoBackfillRetryDetails | VideoBackfillRunDetails
        target: typeof AUDIT_TARGET_TABLES.VIDEO_BACKFILL
      }
  VIDEO_DELETE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.VIDEOS
  }
  VIDEO_RESTORE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.VIDEOS
  }
  VIDEO_SYNC: {
    details: EntityChanges<VideoSyncFields>
    target: typeof AUDIT_TARGET_TABLES.VIDEOS
  }
  VIDEO_UPDATE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.VIDEOS
  }
  VIDEO_VISIBILITY_TOGGLE: {
    details: EntityRef
    target: typeof AUDIT_TARGET_TABLES.VIDEOS
  }
  YOUTUBE_CHANNEL_CREATE: {
    details: Pick<
      Tables<'youtube_channels'>,
      'name' | 'talent_id' | 'youtube_channel_id' | 'youtube_handle'
    >
    target: typeof AUDIT_TARGET_TABLES.YOUTUBE_CHANNELS
  }
  YOUTUBE_CHANNEL_DELETE: {
    details: Pick<
      Tables<'youtube_channels'>,
      'talent_id' | 'youtube_channel_id'
    >
    target: typeof AUDIT_TARGET_TABLES.YOUTUBE_CHANNELS
  }
}

/** What an audit log entry of the action records in `details`. */
export type AuditLogDetails<A extends AuditAction> =
  AuditLogDefinitions[A]['details']

type AuditLogTarget<A extends AuditAction> = AuditLogDefinitions[A]['target']

/**
 * The target table of each action. An action whose entries are about more
 * than one table picks it from the details.
 */
const AUDIT_LOG_TARGETS = {
  ACCOUNT_EMAIL_UPDATE: AUDIT_TARGET_TABLES.AUTH_USERS,
  ACCOUNT_PASSWORD_UPDATE: AUDIT_TARGET_TABLES.AUTH_USERS,
  ANNOUNCEMENT_CREATE: AUDIT_TARGET_TABLES.ANNOUNCEMENTS,
  ANNOUNCEMENT_DELETE: AUDIT_TARGET_TABLES.ANNOUNCEMENTS,
  ANNOUNCEMENT_UPDATE: AUDIT_TARGET_TABLES.ANNOUNCEMENTS,
  CHANNEL_ACTIVATE: AUDIT_TARGET_TABLES.CHANNELS,
  CHANNEL_CREATE: AUDIT_TARGET_TABLES.CHANNELS,
  CHANNEL_DELETE: AUDIT_TARGET_TABLES.CHANNELS,
  CHANNEL_RESTORE: AUDIT_TARGET_TABLES.CHANNELS,
  CHANNEL_RETIRE: AUDIT_TARGET_TABLES.CHANNELS,
  CHANNEL_SYNC: AUDIT_TARGET_TABLES.TALENTS,
  CHANNEL_UPDATE: AUDIT_TARGET_TABLES.CHANNELS,
  MAINTENANCE_MODE_DISABLE: AUDIT_TARGET_TABLES.SYSTEM,
  MAINTENANCE_MODE_ENABLE: AUDIT_TARGET_TABLES.SYSTEM,
  RECOMMENDED_QUERY_CREATE: AUDIT_TARGET_TABLES.RECOMMENDED_QUERIES,
  RECOMMENDED_QUERY_DELETE: AUDIT_TARGET_TABLES.RECOMMENDED_QUERIES,
  TERM_CREATE: AUDIT_TARGET_TABLES.TERMS,
  TERM_DELETE: AUDIT_TARGET_TABLES.TERMS,
  TERM_UPDATE: AUDIT_TARGET_TABLES.TERMS,
  TWITCH_USER_CREATE: AUDIT_TARGET_TABLES.TWITCH_USERS,
  TWITCH_USER_DELETE: AUDIT_TARGET_TABLES.TWITCH_USERS,
  VIDEO_BACKFILL: (details) =>
    'scope' in details
      ? AUDIT_TARGET_TABLES.VIDEO_BACKFILL
      : AUDIT_TARGET_TABLES.CHANNELS,
  VIDEO_DELETE: AUDIT_TARGET_TABLES.VIDEOS,
  VIDEO_RESTORE: AUDIT_TARGET_TABLES.VIDEOS,
  VIDEO_SYNC: AUDIT_TARGET_TABLES.VIDEOS,
  VIDEO_UPDATE: AUDIT_TARGET_TABLES.VIDEOS,
  VIDEO_VISIBILITY_TOGGLE: AUDIT_TARGET_TABLES.VIDEOS,
  YOUTUBE_CHANNEL_CREATE: AUDIT_TARGET_TABLES.YOUTUBE_CHANNELS,
  YOUTUBE_CHANNEL_DELETE: AUDIT_TARGET_TABLES.YOUTUBE_CHANNELS,
} satisfies {
  [A in AuditAction]:
    | AuditLogTarget<A>
    | ((details: AuditLogDetails<A>) => AuditLogTarget<A>)
}

/** The details argument of `createAuditLog`, left out when there are none. */
type AuditLogDetailsArgs<A extends AuditAction> = [AuditLogDetails<A>] extends [
  undefined,
]
  ? []
  : [details: AuditLogDetails<A>]

/** Returns the table that an entry of the action with the details is about. */
export function getAuditTargetTable<A extends AuditAction>(
  action: A,
  details: AuditLogDetails<A>,
): AuditTargetTable {
  const target: AuditTargetTable | ((details: never) => AuditTargetTable) =
    AUDIT_LOG_TARGETS[action]

  return typeof target === 'function' ? target(details as never) : target
}

/**
 * Records an audit log entry of the action. The target table follows from
 * the action, and the details must have the shape that the action records.
 */
export async function createAuditLog<A extends AuditAction>(
  action: A,
  targetRecordId: string | null,
  ...[details]: AuditLogDetailsArgs<A>
): Promise<void> {
  try {
    const supabaseClient = await createSupabaseServerClient()
    const { error } = await supabaseClient.rpc('insert_audit_log', {
      p_action: action,
      // The details are plain JSON values, but an interface has no index
      // signature, so TypeScript cannot see that it is assignable to `Json`.
      p_details: (details ?? null) as AuditLogJson,
      p_target_table: getAuditTargetTable(action, details),
      ...(targetRecordId ? { p_target_record_id: targetRecordId } : {}),
    })

    if (error) {
      console.error('Failed to create audit log:', error)
    }
  } catch (error) {
    console.error('Error creating audit log:', error)
  }
}
