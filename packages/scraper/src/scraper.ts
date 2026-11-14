import { Temporal } from 'temporal-polyfill'
import type { Logger } from './internal/logger.js'
import type {
  CrawlContext,
  ErrorReporter,
  ScraperOptions,
  TypedSupabaseClient,
} from './types.js'

const silentLogger: Logger = {
  debug() {},
  error() {},
  info() {},
  warn() {},
}

/**
 * Keeps the videos and accounts of one platform in the database in sync with
 * that platform.
 *
 * Every platform offers the same five operations, so callers (the cron routes)
 * never need to know which platform they are driving:
 *
 * | Operation                 | What it does                                    |
 * | ------------------------- | ----------------------------------------------- |
 * | `addNewVideos`            | saves videos that appeared on tracked accounts  |
 * | `refreshLiveVideos`       | follows videos that are scheduled or on air     |
 * | `refreshRecentVideos`     | re-reads the newest finished videos             |
 * | `removeUnavailableVideos` | soft-deletes videos that are gone, across all   |
 * | `syncAccounts`            | updates names and handles of tracked accounts   |
 *
 * How a platform is read and how its videos are stored (its own link table,
 * its own notion of a broadcast) is entirely up to the subclass.
 *
 * ## Guarantees
 *
 * - A failure that concerns one account or one video does not stop the run: it
 *   is passed to `onError` and the rest is processed.
 * - An operation rejects only when the run as a whole cannot proceed (the
 *   platform or the database is unreachable). Nothing is deleted in that case.
 * - Each operation resolves to whether it changed anything the public site
 *   shows, so callers know when to refresh caches.
 */
export abstract class Scraper {
  /** Name of the platform, as stored in `videos.platform`. */
  abstract readonly provider: string

  protected readonly logger: Logger
  protected readonly supabaseClient: TypedSupabaseClient
  readonly #onError: ErrorReporter | undefined

  constructor({ logger, onError, supabaseClient }: ScraperOptions) {
    this.logger = logger ?? silentLogger
    this.#onError = onError
    this.supabaseClient = supabaseClient
  }

  /**
   * Saves videos that appeared on the accounts of active talents.
   * Videos that are already saved are left alone.
   */
  abstract addNewVideos(now?: Temporal.Instant): Promise<boolean>

  /**
   * Follows the videos that change from minute to minute: scheduled ones and
   * those on air. Starts, title changes and endings are picked up here.
   */
  abstract refreshLiveVideos(now?: Temporal.Instant): Promise<boolean>

  /**
   * Re-reads the newest finished videos of active talents: updates what
   * changed and soft-deletes the ones the platform no longer returns.
   */
  abstract refreshRecentVideos(now?: Temporal.Instant): Promise<boolean>

  /**
   * Checks every saved video of non-deleted talents and soft-deletes the ones
   * the platform no longer returns. Details are not refreshed.
   */
  abstract removeUnavailableVideos(now?: Temporal.Instant): Promise<boolean>

  /**
   * Brings names and handles of the saved accounts in line with the platform.
   */
  abstract syncAccounts(now?: Temporal.Instant): Promise<boolean>

  /**
   * Reports a failure that does not stop the run.
   */
  protected reportError: ErrorReporter = (error, context) => {
    if (this.#onError) {
      this.#onError(error, context)
      return
    }

    this.logger.error('Failed to process an item', {
      ...context,
      error,
      provider: this.provider,
    })
  }

  /**
   * Bundles what a crawl operation needs for one run.
   */
  protected createContext<TFetcher>(
    fetcher: TFetcher,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): CrawlContext<TFetcher> {
    return {
      fetcher,
      logger: this.logger,
      now,
      reportError: this.reportError,
      supabaseClient: this.supabaseClient,
    }
  }
}
