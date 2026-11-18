import type { default as Database, Enums, Tables } from "@shinju-date/database";
import { logger } from "@shinju-date/logger";
import type { AccountChanges } from "@shinju-date/scraper";

import type { TypedSupabaseClient } from "@/lib/supabase";

export type AuditAction = Enums<"audit_action">;

type AuditLogJson = Exclude<
  Database["public"]["Functions"]["insert_audit_log"]["Args"]["p_details"],
  undefined
>;

type AuditLogEntriesJson =
  Database["public"]["Functions"]["insert_audit_logs"]["Args"]["p_entries"];

/** Values of `audit_logs.target_table`: what an audit log entry is about. */
export const AUDIT_TARGET_TABLES = {
  ANNOUNCEMENTS: "announcements",
  AUTH_USERS: "auth.users",
  FEATURE_REQUESTS: "feature_requests",
  RECOMMENDED_QUERIES: "redis:recommended_queries",
  SYSTEM: "redis:system",
  TALENTS: "talents",
  TERMS: "terms",
  VIDEO_BACKFILL: "redis:video-backfill",
  VIDEOS: "videos",
} as const;

/**
 * The former name of `talents`. Entries recorded before the rename keep it
 * as their target table; no new entry is recorded against it.
 */
export const LEGACY_TALENTS_TARGET_TABLE = "channels";

export type AuditTargetTable =
  (typeof AUDIT_TARGET_TABLES)[keyof typeof AUDIT_TARGET_TABLES];

/** The name of the record, shown in the activity log instead of its ID. */
export interface EntityRef {
  entityName: string;
}

/** The columns that changed, with their values before and after. */
export interface EntityChanges<T> extends EntityRef {
  changes: {
    after: Partial<T>;
    before: Partial<T>;
  };
}

/** The `videos` columns that syncing a video can change. */
export type VideoSyncFields = Pick<
  Tables<"videos">,
  | "deleted_at"
  | "deleted_reason"
  | "duration"
  | "published_at"
  | "status"
  | "title"
  | "video_kind"
>;

export interface AccountEmailUpdateDetails extends EntityRef {
  /** The old address is not known when the change is confirmed. */
  changes: {
    after: { email: string };
  };
}

/**
 * A change to the status or to the memo of a feedback. The memo itself is
 * left out, because it is long: only whether there is one is recorded.
 */
export type FeatureRequestUpdateDetails =
  | EntityChanges<Pick<Tables<"feature_requests">, "status">>
  | EntityChanges<{ hasMemo: boolean }>;

/** An account of a talent that changed when the talent was synced. */
export interface TalentSyncAccount {
  /** The values before and after, when the name or handle changed. */
  changes?: AccountChanges;
  /** Present only when the stored icon was created, replaced or removed. */
  iconUpdated?: boolean;
  /** Primary key of the account row (`youtube_channels` / `twitch_users`). */
  id: string;
  name: string | null;
}

export interface TalentSyncDetails extends EntityRef {
  accounts: TalentSyncAccount[];
  platform: Enums<"platform_type">;
}

/**
 * A YouTube channel or a Twitch user that was added to or removed from a
 * talent. The entry is about the talent, and `account` is the account row.
 */
export interface TalentAccountDetails<T> extends EntityRef {
  account: T;
}

type TwitchUserAccount = Pick<
  Tables<"twitch_users">,
  "id" | "name" | "twitch_login_name" | "twitch_user_id"
>;

type YouTubeChannelAccount = Pick<
  Tables<"youtube_channels">,
  "id" | "name" | "youtube_channel_id" | "youtube_handle"
>;

/** Backfill of the accounts of one talent on one platform. */
export interface TalentVideoBackfillDetails extends EntityRef {
  accounts: { accountId: string; name: string }[];
  platform: Enums<"platform_type">;
}

interface VideoBackfillRequestDetails extends EntityRef {
  /** Accounts that could not be queued because of an error. */
  failed: number;
  /** Accounts left out because they were being backfilled already. */
  skipped: number;
}

/** A check of all talents for videos that are not saved. */
export interface VideoBackfillRunDetails extends VideoBackfillRequestDetails {
  /** Accounts that were queued. */
  accounts: number;
  scope: "all";
  /** Accounts of active talents, by platform. */
  targets: Record<Enums<"platform_type">, number>;
}

/** A retry of the backfills that failed. */
export interface VideoBackfillRetryDetails extends VideoBackfillRequestDetails {
  accounts: {
    accountId: string;
    name: string;
    provider: Enums<"platform_type">;
    talentId: string;
  }[];
  scope: "retry";
}

/**
 * What each audit action is about (`target`) and what it records in
 * `details`. `details: undefined` means that the action records no details.
 */
interface AuditLogDefinitions {
  ACCOUNT_EMAIL_UPDATE: {
    details: AccountEmailUpdateDetails;
    target: typeof AUDIT_TARGET_TABLES.AUTH_USERS;
  };
  ACCOUNT_PASSWORD_UPDATE: {
    details: undefined;
    target: typeof AUDIT_TARGET_TABLES.AUTH_USERS;
  };
  ANNOUNCEMENT_CREATE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.ANNOUNCEMENTS;
  };
  ANNOUNCEMENT_DELETE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.ANNOUNCEMENTS;
  };
  ANNOUNCEMENT_UPDATE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.ANNOUNCEMENTS;
  };
  CHANNEL_ACTIVATE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  CHANNEL_CREATE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  CHANNEL_DELETE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  CHANNEL_RESTORE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  CHANNEL_RETIRE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  CHANNEL_SYNC: {
    details: TalentSyncDetails;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  CHANNEL_UPDATE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  FEATURE_REQUEST_UPDATE: {
    details: FeatureRequestUpdateDetails;
    target: typeof AUDIT_TARGET_TABLES.FEATURE_REQUESTS;
  };
  MAINTENANCE_MODE_DISABLE: {
    details: undefined;
    target: typeof AUDIT_TARGET_TABLES.SYSTEM;
  };
  MAINTENANCE_MODE_ENABLE: {
    details: undefined;
    target: typeof AUDIT_TARGET_TABLES.SYSTEM;
  };
  RECOMMENDED_QUERY_CREATE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.RECOMMENDED_QUERIES;
  };
  RECOMMENDED_QUERY_DELETE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.RECOMMENDED_QUERIES;
  };
  TERM_CREATE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.TERMS;
  };
  TERM_DELETE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.TERMS;
  };
  TERM_UPDATE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.TERMS;
  };
  TWITCH_USER_CREATE: {
    details: TalentAccountDetails<TwitchUserAccount>;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  TWITCH_USER_DELETE: {
    details: TalentAccountDetails<TwitchUserAccount>;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  VIDEO_BACKFILL:
    | {
        details: TalentVideoBackfillDetails;
        target: typeof AUDIT_TARGET_TABLES.TALENTS;
      }
    | {
        details: VideoBackfillRetryDetails | VideoBackfillRunDetails;
        target: typeof AUDIT_TARGET_TABLES.VIDEO_BACKFILL;
      };
  VIDEO_DELETE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.VIDEOS;
  };
  VIDEO_RESTORE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.VIDEOS;
  };
  VIDEO_SYNC: {
    details: EntityChanges<VideoSyncFields>;
    target: typeof AUDIT_TARGET_TABLES.VIDEOS;
  };
  VIDEO_UPDATE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.VIDEOS;
  };
  VIDEO_VISIBILITY_TOGGLE: {
    details: EntityRef;
    target: typeof AUDIT_TARGET_TABLES.VIDEOS;
  };
  YOUTUBE_CHANNEL_CREATE: {
    details: TalentAccountDetails<YouTubeChannelAccount>;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
  YOUTUBE_CHANNEL_DELETE: {
    details: TalentAccountDetails<YouTubeChannelAccount>;
    target: typeof AUDIT_TARGET_TABLES.TALENTS;
  };
}

/** What an audit log entry of the action records in `details`. */
export type AuditLogDetails<A extends AuditAction> =
  AuditLogDefinitions[A]["details"];

type AuditLogTarget<A extends AuditAction> = AuditLogDefinitions[A]["target"];

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
  CHANNEL_ACTIVATE: AUDIT_TARGET_TABLES.TALENTS,
  CHANNEL_CREATE: AUDIT_TARGET_TABLES.TALENTS,
  CHANNEL_DELETE: AUDIT_TARGET_TABLES.TALENTS,
  CHANNEL_RESTORE: AUDIT_TARGET_TABLES.TALENTS,
  CHANNEL_RETIRE: AUDIT_TARGET_TABLES.TALENTS,
  CHANNEL_SYNC: AUDIT_TARGET_TABLES.TALENTS,
  CHANNEL_UPDATE: AUDIT_TARGET_TABLES.TALENTS,
  FEATURE_REQUEST_UPDATE: AUDIT_TARGET_TABLES.FEATURE_REQUESTS,
  MAINTENANCE_MODE_DISABLE: AUDIT_TARGET_TABLES.SYSTEM,
  MAINTENANCE_MODE_ENABLE: AUDIT_TARGET_TABLES.SYSTEM,
  RECOMMENDED_QUERY_CREATE: AUDIT_TARGET_TABLES.RECOMMENDED_QUERIES,
  RECOMMENDED_QUERY_DELETE: AUDIT_TARGET_TABLES.RECOMMENDED_QUERIES,
  TERM_CREATE: AUDIT_TARGET_TABLES.TERMS,
  TERM_DELETE: AUDIT_TARGET_TABLES.TERMS,
  TERM_UPDATE: AUDIT_TARGET_TABLES.TERMS,
  TWITCH_USER_CREATE: AUDIT_TARGET_TABLES.TALENTS,
  TWITCH_USER_DELETE: AUDIT_TARGET_TABLES.TALENTS,
  VIDEO_BACKFILL: (details) =>
    "scope" in details
      ? AUDIT_TARGET_TABLES.VIDEO_BACKFILL
      : AUDIT_TARGET_TABLES.TALENTS,
  VIDEO_DELETE: AUDIT_TARGET_TABLES.VIDEOS,
  VIDEO_RESTORE: AUDIT_TARGET_TABLES.VIDEOS,
  VIDEO_SYNC: AUDIT_TARGET_TABLES.VIDEOS,
  VIDEO_UPDATE: AUDIT_TARGET_TABLES.VIDEOS,
  VIDEO_VISIBILITY_TOGGLE: AUDIT_TARGET_TABLES.VIDEOS,
  YOUTUBE_CHANNEL_CREATE: AUDIT_TARGET_TABLES.TALENTS,
  YOUTUBE_CHANNEL_DELETE: AUDIT_TARGET_TABLES.TALENTS,
} satisfies {
  [A in AuditAction]:
    | AuditLogTarget<A>
    | ((details: AuditLogDetails<A>) => AuditLogTarget<A>);
};

/** The details argument of `createAuditLog`, left out when there are none. */
type AuditLogDetailsArgs<A extends AuditAction> = [AuditLogDetails<A>] extends [
  undefined,
]
  ? []
  : [details: AuditLogDetails<A>];

/** The `details` of an `AuditLogEntry`, left out when the action has none. */
type AuditLogEntryDetails<A extends AuditAction> = [
  AuditLogDetails<A>,
] extends [undefined]
  ? { details?: undefined }
  : { details: AuditLogDetails<A> };

/** One entry for `createAuditLogs`, with the details that the action records. */
export type AuditLogEntry = {
  [A in AuditAction]: {
    action: A;
    targetRecordId: string | null;
  } & AuditLogEntryDetails<A>;
}[AuditAction];

/** An element of the `p_entries` array of `insert_audit_logs`. */
interface AuditLogRow {
  action: AuditAction;
  details: AuditLogJson;
  target_record_id: string | null;
  target_table: AuditTargetTable;
}

/** Returns the table that an entry of the action with the details is about. */
export const getAuditTargetTable = <A extends AuditAction>(
  action: A,
  details: AuditLogDetails<A>
): AuditTargetTable => {
  const target: AuditTargetTable | ((details: never) => AuditTargetTable) =
    AUDIT_LOG_TARGETS[action];

  return typeof target === "function" ? target(details as never) : target;
};

/**
 * The details as the JSON that the RPC takes. They are plain JSON values, but
 * an interface has no index signature, so TypeScript cannot see that it is
 * assignable to `Json`.
 */
const toAuditLogJson = (details: unknown): AuditLogJson =>
  (details ?? null) as AuditLogJson;

/**
 * Records an audit log entry of the action, as the user that the client is
 * authenticated as. The target table follows from the action, and the
 * details must have the shape that the action records.
 *
 * A failure is logged and does not throw, so that it does not fail the
 * action that has already made its change.
 */
export const createAuditLog = async <A extends AuditAction>(
  supabaseClient: TypedSupabaseClient,
  action: A,
  targetRecordId: string | null,
  ...[details]: AuditLogDetailsArgs<A>
): Promise<void> => {
  try {
    const { error } = await supabaseClient.rpc("insert_audit_log", {
      p_action: action,
      p_details: toAuditLogJson(details),
      p_target_table: getAuditTargetTable(action, details),
      ...(targetRecordId ? { p_target_record_id: targetRecordId } : {}),
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error("監査ログの記録に失敗しました", {
      action,
      error,
      targetRecordId: targetRecordId ?? undefined,
    });
  }
};

/**
 * Records the audit log entries with one call, as the user that the client
 * is authenticated as. Each entry is recorded as `createAuditLog` would
 * record it. Nothing is called when there are no entries.
 *
 * A failure is logged and does not throw, like `createAuditLog`.
 */
export const createAuditLogs = async (
  supabaseClient: TypedSupabaseClient,
  entries: readonly AuditLogEntry[]
): Promise<void> => {
  if (entries.length === 0) {
    return;
  }

  const rows = entries.map(
    ({ action, details, targetRecordId }): AuditLogRow => ({
      action,
      details: toAuditLogJson(details),
      // `createAuditLog` leaves out an empty ID, so it is recorded as NULL
      target_record_id: targetRecordId || null,
      target_table: getAuditTargetTable(action, details as never),
    })
  );

  try {
    const { error } = await supabaseClient.rpc("insert_audit_logs", {
      // An interface has no index signature, so TypeScript cannot see that
      // the rows are assignable to `Json`.
      p_entries: rows as unknown as AuditLogEntriesJson,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error("監査ログの記録に失敗しました", {
      action: [...new Set(rows.map((row) => row.action))].join(","),
      error,
      targetRecordId: rows
        .flatMap((row) => (row.target_record_id ? [row.target_record_id] : []))
        .join(","),
    });
  }
};
