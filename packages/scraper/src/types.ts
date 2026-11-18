import type Database from '@shinju-date/database'
import type { Tables } from '@shinju-date/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Logger } from './internal/logger.js'

export type { Logger }

export type TypedSupabaseClient = SupabaseClient<Database>

/**
 * Receives failures that do not stop a run, e.g. one channel that could not
 * be read or one video that could not be saved.
 */
export type ErrorReporter = (
  error: unknown,
  context: Record<string, unknown>,
) => void

export interface ScraperOptions {
  /** Maximum number of platform API requests in flight (default: 5). */
  concurrency?: number
  logger?: Logger
  /**
   * Called for every failure that does not stop a run. Defaults to logging
   * the failure with `logger`.
   */
  onError?: ErrorReporter
  /** Client the scraper reads and writes the database with. */
  supabaseClient: TypedSupabaseClient
}

/** What code that writes to the database needs during one run. */
export interface WriteContext {
  logger: Logger
  /**
   * The time of the run. The timestamps written to the rows it inserts
   * (`updated_at` and so on) and `deleted_at` of the rows it soft-deletes are
   * all this time. The `updated_at` of the rows it updates is the current
   * time of the database instead: the triggers of the tables set it.
   */
  now: Temporal.Instant
  reportError: ErrorReporter
  supabaseClient: TypedSupabaseClient
}

/** What a crawl operation needs during one run. */
export interface CrawlContext<TFetcher> extends WriteContext {
  /** Reads from the platform. */
  fetcher: TFetcher
}

export interface AddPastVideosOptions {
  /**
   * Primary key of the account row: `youtube_channels.id` for YouTube,
   * `twitch_users.id` for Twitch.
   */
  accountId: string
  /**
   * Where the previous call stopped, as returned in
   * {@link AddPastVideosResult.cursor}. Omit to start from the newest videos.
   */
  cursor?: string | null | undefined
  now?: Temporal.Instant | undefined
}

export interface AddPastVideosResult {
  /** Number of videos that were saved. */
  added: number
  /**
   * Where to continue with the next call, or `null` when the whole history of
   * the account has been read.
   */
  cursor: string | null
  /** Number of videos the platform listed on the page that was read. */
  listed: number
}

/**
 * The `videos` columns a refresh keeps in line with the platform: title,
 * duration, start time, status and kind. Twitch has no kinds, so its
 * `video_kind` is never changed.
 */
export type VideoFields = Pick<
  Tables<'videos'>,
  'duration' | 'published_at' | 'status' | 'title' | 'video_kind'
>

/** What `Scraper#refreshVideo` did with the video. */
export type RefreshVideoResult =
  /**
   * The video was updated. `before` and `after` hold only the columns that
   * changed; both are empty when only something else changed (a thumbnail
   * that became available, or the archive a Twitch broadcast is linked to).
   */
  | {
      after: Partial<VideoFields>
      before: Partial<VideoFields>
      status: 'updated'
      /** The title of the video after the update. */
      title: string
    }
  /** The video already matches the platform. */
  | { status: 'unchanged'; title: string }
  /**
   * The platform no longer returns the video, so it was soft-deleted with the
   * reason `unavailable`, exactly like the scheduled refreshes do.
   */
  | { status: 'unavailable' }
  /**
   * No video with that ID is saved (or it was deleted already), or it belongs
   * to another platform.
   */
  | { status: 'not-found' }

/**
 * The account columns a sync keeps in line with the platform: the name and
 * the handle (YouTube) or login (Twitch). The icon is reported separately.
 */
export type AccountFields =
  | Pick<Tables<'twitch_users'>, 'name' | 'twitch_login_name'>
  | Pick<Tables<'youtube_channels'>, 'name' | 'youtube_handle'>

/** The account columns that changed, before and after. */
export interface AccountChanges<TFields extends AccountFields = AccountFields> {
  after: Partial<TFields>
  before: Partial<TFields>
}

/** What `Scraper#syncTalentAccounts` did with one account of the talent. */
export interface SyncAccountResult<
  TFields extends AccountFields = AccountFields,
> {
  /**
   * Primary key of the account row: `youtube_channels.id` for YouTube,
   * `twitch_users.id` for Twitch.
   */
  accountId: string
  /**
   * The columns that were written, before and after. Present only when the
   * name or the handle changed.
   */
  changes?: AccountChanges<TFields>
  /** Whether the stored icon was created, replaced or removed. */
  iconUpdated: boolean
  /**
   * The name of the account on the platform, or the saved one when the
   * platform did not return the account or it could not be updated.
   */
  name: string | null
  /**
   * - `updated`: the name, the handle or the icon was written
   * - `unchanged`: the account already matches the platform
   * - `not-found`: the platform did not return the account
   * - `failed`: the name and the handle could not be written (the failure is
   *   passed to `onError`). The icon is still synced, so `iconUpdated` can
   *   be `true`
   */
  status: 'failed' | 'not-found' | 'unchanged' | 'updated'
}
