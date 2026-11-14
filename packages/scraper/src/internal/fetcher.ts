import { toBatches, unique } from './batch.js'
import type {
  AccountFailure,
  FetcherOptions,
  RecentVideoIdsResult,
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
 *   {@link getRecentVideoIds} / {@link getRecentVideos}
 * - **videos by ID**, to refresh or check the ones already known:
 *   {@link getVideos} / {@link findMissingVideoIds}
 *
 * Accounts and videos keep the shape of their platform (`TAccount`, `TVideo`).
 * Subclasses implement the three abstract methods with {@link fetchByIds},
 * {@link fetchInBatches} and {@link fetchPerAccount}, which deduplicate and
 * batch IDs, bound concurrency and isolate failures per account, and override
 * {@link getRecentVideos} or {@link findMissingVideoIds} only when the
 * platform offers a cheaper way than the default.
 *
 * - `concurrency` bounds the requests in flight for the whole fetcher.
 * - Listing recent videos never fails because of one account: accounts that
 *   fail are returned in `failures`.
 * - Every other method rejects when a request fails, so a partial result is
 *   never mistaken for "these IDs are gone".
 */
export abstract class Fetcher<
  TAccount,
  TVideo,
  TRecentVideosOptions extends RecentVideosOptions = RecentVideosOptions,
> {
  /** Name of the platform, e.g. for logs. */
  abstract readonly provider: string

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
   * Lists the IDs of the newest videos of each account.
   */
  abstract getRecentVideoIds(
    accountIds: readonly string[],
    options?: TRecentVideosOptions,
  ): Promise<RecentVideoIdsResult>

  /**
   * Gets videos by ID and reports the IDs the platform did not return.
   */
  abstract getVideos(
    videoIds: readonly string[],
  ): Promise<VideoLookupResult<TVideo>>

  /**
   * Lists the newest videos of each account.
   *
   * When only some of them are of interest (e.g. the ones not saved yet),
   * prefer {@link getRecentVideoIds} followed by {@link getVideos} for those:
   * on platforms where video details are a separate request, that avoids
   * fetching details nobody needs.
   */
  async getRecentVideos(
    accountIds: readonly string[],
    options?: TRecentVideosOptions,
  ): Promise<RecentVideosResult<TVideo>> {
    const { accounts, failures, missingAccountIds } =
      await this.getRecentVideoIds(accountIds, options)
    const { videos } = await this.getVideos(
      accounts.flatMap((account) => account.videoIds),
    )

    return { failures, missingAccountIds, videos }
  }

  /**
   * Returns the IDs of the videos that no longer exist on the platform
   * (deleted or made private).
   */
  async findMissingVideoIds(videoIds: readonly string[]): Promise<string[]> {
    const { missingIds } = await this.getVideos(videoIds)

    return missingIds
  }

  /**
   * Makes a single request, counted against `concurrency` like every other.
   */
  protected request<T>(task: () => Promise<T>): Promise<T> {
    return this.#queue.run(task)
  }

  /**
   * Fetches resources for a list of IDs in batches of `batchSize`.
   * Rejects when a batch fails.
   */
  protected async fetchInBatches<T>(
    ids: readonly string[],
    batchSize: number,
    fetch: (ids: string[]) => AsyncIterable<T>,
  ): Promise<T[]> {
    const batches = await this.#queue.map(toBatches(ids, batchSize), (batch) =>
      Array.fromAsync(fetch(batch)),
    )

    return batches.flat()
  }

  /**
   * Looks resources up by their ID in batches of `batchSize` and reports the
   * IDs that were not returned. Rejects when a batch fails.
   */
  protected async fetchByIds<T extends { id: string }>(
    ids: readonly string[],
    batchSize: number,
    fetch: (ids: string[]) => AsyncIterable<T>,
  ): Promise<LookupResult<T>> {
    const requestedIds = unique(ids)
    const found = await this.fetchInBatches(requestedIds, batchSize, fetch)
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
