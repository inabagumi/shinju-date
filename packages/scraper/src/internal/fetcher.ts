import type { Enums } from '@shinju-date/database'
import { unique } from './batch.js'
import type {
  AccountFailure,
  FetcherOptions,
  RecentVideosOptions,
  RecentVideosResult,
  VideoLookupResult,
} from './fetcher-types.js'
import type { Logger } from './logger.js'
import { RequestQueue } from './request-queue.js'

export const DEFAULT_RECENT_VIDEOS_LIMIT = 20

/** Resources of one kind looked up by ID. */
export interface LookupResult<T> {
  found: T[]
  /** Requested IDs the platform did not return. */
  missingIds: string[]
}

/** What was fetched for each account, and the accounts that failed. */
export interface PerAccountResult<T> {
  failures: AccountFailure[]
  results: { accountId: string; value: T }[]
}

/**
 * Reads accounts and videos from a video platform.
 *
 * This is the half of a scraper that talks to the platform; what is read is
 * compared with the database and saved by the crawl operations of the
 * scraper. Every platform is read the same way:
 *
 * - **accounts** — where videos are published (a YouTube channel, a Twitch
 *   user): {@link getAccounts}
 * - **recent videos** of accounts, to discover new ones:
 *   {@link getRecentVideos}
 * - **videos by ID**, to refresh or check the ones already known:
 *   {@link getVideos}
 *
 * Accounts and videos keep the shape of their platform (`TAccount`, `TVideo`),
 * and so do the recent videos (`TRecentVideo`): a platform that lists only
 * IDs lists something lighter than a video. Subclasses implement the three
 * abstract methods with {@link fetchByIds} and {@link fetchPerAccount}, which
 * deduplicate IDs, bound concurrency and isolate failures per account, and add
 * the calls only their platform has.
 *
 * - `concurrency` bounds the requests in flight for the whole fetcher. The
 *   API clients split long lists of IDs into the batches one request accepts
 *   and run each request through {@link request}.
 * - Listing recent videos never fails because of one account: accounts that
 *   fail are returned in `failures`.
 * - Every other method rejects when a request fails, so a partial result is
 *   never mistaken for "these IDs are gone".
 */
export abstract class Fetcher<
  TAccount,
  TVideo,
  TRecentVideo = TVideo,
  TRecentVideosOptions extends RecentVideosOptions = RecentVideosOptions,
> {
  /** Name of the platform, e.g. for logs. */
  abstract readonly provider: Enums<'platform_type'>

  protected readonly logger: Logger | undefined
  readonly #queue: RequestQueue

  constructor({ concurrency, logger }: FetcherOptions = {}) {
    this.logger = logger
    this.#queue = new RequestQueue(concurrency)
  }

  /**
   * Gets accounts by ID. Accounts the platform does not return are omitted.
   */
  abstract getAccounts(accountIds: readonly string[]): Promise<TAccount[]>

  /**
   * Lists the newest videos of each account.
   */
  abstract getRecentVideos(
    accountIds: readonly string[],
    options?: TRecentVideosOptions,
  ): Promise<RecentVideosResult<TRecentVideo>>

  /**
   * Gets videos by ID and reports the IDs the platform did not return.
   */
  abstract getVideos(
    videoIds: readonly string[],
  ): Promise<VideoLookupResult<TVideo>>

  /**
   * Makes a single request, counted against `concurrency` like every other.
   * Pass it to the API clients as their `schedule`.
   */
  protected readonly request = <T>(task: () => Promise<T>): Promise<T> =>
    this.#queue.run(task)

  /**
   * Looks resources up by their ID and reports the IDs that were not
   * returned. `fetch` gets the IDs once each; splitting them into batches is
   * left to the API client. Rejects when a request fails.
   */
  protected async fetchByIds<T extends { id: string }>(
    ids: readonly string[],
    fetch: (ids: string[]) => AsyncIterable<T>,
  ): Promise<LookupResult<T>> {
    const requestedIds = unique(ids)

    if (requestedIds.length === 0) {
      return { found: [], missingIds: [] }
    }

    const found = await Array.fromAsync(fetch(requestedIds))
    const foundIds = new Set(found.map((item) => item.id))

    return {
      found,
      missingIds: requestedIds.filter((id) => !foundIds.has(id)),
    }
  }

  /**
   * Fetches something for each account without letting one account stop the
   * others: failures are logged and returned instead of thrown.
   */
  protected async fetchPerAccount<T>(
    accountIds: readonly string[],
    fetch: (accountId: string) => Promise<T>,
  ): Promise<PerAccountResult<T>> {
    const requestedIds = unique(accountIds)
    const settled = await this.#queue.mapSettled(requestedIds, fetch)
    const result: PerAccountResult<T> = { failures: [], results: [] }

    for (const [index, outcome] of settled.entries()) {
      const accountId = requestedIds[index]

      if (accountId === undefined) {
        continue
      }

      if (outcome.status === 'fulfilled') {
        result.results.push({ accountId, value: outcome.value })
      } else {
        this.logger?.error('Failed to fetch data for an account', {
          accountId,
          error: outcome.reason,
          provider: this.provider,
        })
        result.failures.push({ accountId, error: outcome.reason })
      }
    }

    return result
  }
}
