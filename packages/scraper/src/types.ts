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
  /** The time of the run; every row touched by it gets the same timestamp. */
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
