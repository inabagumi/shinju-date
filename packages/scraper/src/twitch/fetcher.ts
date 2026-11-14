import {
  getClips,
  getStreamsByUserIds,
  getUsers,
  getVideos,
  getVideosByUser,
  TWITCH_API_MAX_RESULTS,
} from '@shinju-date/twitch-api-client'
import {
  DEFAULT_RECENT_VIDEOS_LIMIT,
  Fetcher,
  type PerAccountResult,
} from '../internal/fetcher.js'
import type {
  RecentVideoIdsResult,
  RecentVideosResult,
  VideoLookupResult,
} from '../internal/fetcher-types.js'
import type {
  ClipLookupResult,
  TwitchApi,
  TwitchFetcherOptions,
  TwitchRecentVideosOptions,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from './types.js'

const defaultClient: TwitchApi = {
  getClips,
  getStreamsByUserIds,
  getUsers,
  getVideos,
  getVideosByUser,
}

/**
 * Reads users, videos, clips and live streams from the Twitch Helix API.
 * An account is a Twitch user, identified by its Helix user ID.
 *
 * Besides what every fetcher offers it knows two things only Twitch has: the
 * streams that are on air ({@link getLiveStreams}) and clips
 * ({@link getClips}).
 */
export class TwitchFetcher extends Fetcher<
  TwitchUser,
  TwitchVideo,
  TwitchRecentVideosOptions
> {
  readonly provider = 'twitch'

  readonly #client: TwitchApi

  constructor({ client, ...options }: TwitchFetcherOptions = {}) {
    super(options)

    this.#client = client ?? defaultClient
  }

  /**
   * Gets users by Helix user ID.
   */
  async getAccounts(accountIds: readonly string[]): Promise<TwitchUser[]> {
    const { found } = await this.fetchByIds(
      accountIds,
      TWITCH_API_MAX_RESULTS,
      (ids) => this.#client.getUsers({ ids }),
    )

    return found
  }

  #listRecentVideos(
    accountIds: readonly string[],
    {
      limit = DEFAULT_RECENT_VIDEOS_LIMIT,
      type = 'archive',
    }: TwitchRecentVideosOptions = {},
  ): Promise<PerAccountResult<TwitchVideo[]>> {
    return this.fetchPerAccount(accountIds, (userId) =>
      Array.fromAsync(this.#client.getVideosByUser({ limit, type, userId })),
    )
  }

  /**
   * Lists the newest videos of each broadcaster.
   *
   * Helix returns full videos when listing, so unlike the default this takes
   * no second request. It also cannot tell an unknown broadcaster from one
   * without videos: `missingAccountIds` is always empty.
   */
  override async getRecentVideos(
    accountIds: readonly string[],
    options?: TwitchRecentVideosOptions,
  ): Promise<RecentVideosResult<TwitchVideo>> {
    const { failures, results } = await this.#listRecentVideos(
      accountIds,
      options,
    )

    return {
      failures,
      missingAccountIds: [],
      videos: results.flatMap(({ value }) => value),
    }
  }

  async getRecentVideoIds(
    accountIds: readonly string[],
    options?: TwitchRecentVideosOptions,
  ): Promise<RecentVideoIdsResult> {
    const { failures, results } = await this.#listRecentVideos(
      accountIds,
      options,
    )

    return {
      accounts: results.map(({ accountId, value }) => ({
        accountId,
        videoIds: value.map((video) => video.id),
      })),
      failures,
      missingAccountIds: [],
    }
  }

  /**
   * Gets videos (archive / highlight / upload) by ID. Clips are a different
   * resource: see {@link getClips}.
   */
  async getVideos(
    videoIds: readonly string[],
  ): Promise<VideoLookupResult<TwitchVideo>> {
    const { found, missingIds } = await this.fetchByIds(
      videoIds,
      TWITCH_API_MAX_RESULTS,
      (ids) => this.#client.getVideos({ ids }),
    )

    return { missingIds, videos: found }
  }

  /**
   * Gets the streams that are live right now for the given broadcasters.
   * Offline broadcasters are omitted (Helix does not return them).
   */
  getLiveStreams(accountIds: readonly string[]): Promise<TwitchStream[]> {
    return this.fetchInBatches(accountIds, TWITCH_API_MAX_RESULTS, (userIds) =>
      this.#client.getStreamsByUserIds({ userIds }),
    )
  }

  /**
   * Gets clips by ID (slug) and reports the IDs Helix did not return.
   */
  async getClips(clipIds: readonly string[]): Promise<ClipLookupResult> {
    const { found, missingIds } = await this.fetchByIds(
      clipIds,
      TWITCH_API_MAX_RESULTS,
      (ids) => this.#client.getClips({ ids }),
    )

    return { clips: found, missingIds }
  }
}
