import type { youtube_v3 as youtube } from '@googleapis/youtube'
import {
  getChannels,
  getPlaylistItems,
  getVideoIds,
  getVideos,
  isYouTubeApiError,
  YOUTUBE_DATA_API_MAX_RESULTS,
} from '@shinju-date/youtube-api-client'
import { unique } from '../internal/batch.js'
import { DEFAULT_RECENT_VIDEOS_LIMIT, Fetcher } from '../internal/fetcher.js'
import type {
  RecentVideoIdsResult,
  RecentVideosOptions,
  VideoLookupResult,
} from '../internal/fetcher-types.js'
import type {
  YouTubeChannel,
  YouTubeFetcherOptions,
  YouTubeVideo,
} from './types.js'

/**
 * Reads channels and videos from the YouTube Data API.
 * An account is a YouTube channel.
 */
export class YouTubeFetcher extends Fetcher<YouTubeChannel, YouTubeVideo> {
  readonly provider = 'youtube'

  readonly #client: youtube.Youtube | undefined

  constructor({ client, ...options }: YouTubeFetcherOptions = {}) {
    super(options)

    this.#client = client
  }

  /**
   * Gets channels by channel ID (`UC...`).
   */
  async getAccounts(accountIds: readonly string[]): Promise<YouTubeChannel[]> {
    const { found } = await this.fetchByIds(
      accountIds,
      YOUTUBE_DATA_API_MAX_RESULTS,
      (ids) => getChannels({ client: this.#client, ids }),
    )

    return found
  }

  /**
   * Lists the newest entries of each channel's uploads playlist.
   *
   * YouTube only returns IDs here; video details are a separate request
   * ({@link getVideos}), so ask for them only for the IDs that matter.
   */
  async getRecentVideoIds(
    accountIds: readonly string[],
    { limit = DEFAULT_RECENT_VIDEOS_LIMIT }: RecentVideosOptions = {},
  ): Promise<RecentVideoIdsResult> {
    const requestedIds = unique(accountIds)
    const channels = await this.getAccounts(requestedIds)
    const channelById = new Map(
      channels.map((channel) => [channel.id, channel]),
    )

    const { failures, results } = await this.fetchPerAccount(
      [...channelById.keys()],
      (channelId) =>
        this.#getUploadedVideoIds(channelById.get(channelId), limit),
    )

    return {
      accounts: results.map(({ accountId, value }) => ({
        accountId,
        videoIds: value,
      })),
      failures,
      missingAccountIds: requestedIds.filter((id) => !channelById.has(id)),
    }
  }

  async #getUploadedVideoIds(
    channel: YouTubeChannel | undefined,
    limit: number,
  ): Promise<string[]> {
    if (!channel) {
      return []
    }

    try {
      const items = await Array.fromAsync(
        getPlaylistItems({
          client: this.#client,
          maxResults: Math.min(limit, YOUTUBE_DATA_API_MAX_RESULTS),
          playlistID: channel.contentDetails.relatedPlaylists.uploads,
        }),
      )

      return unique(items.map((item) => item.contentDetails.videoId))
    } catch (error) {
      // The uploads playlist of a channel without any upload does not exist.
      if (isYouTubeApiError(error, 404)) {
        return []
      }

      throw error
    }
  }

  async getVideos(
    videoIds: readonly string[],
  ): Promise<VideoLookupResult<YouTubeVideo>> {
    const { found, missingIds } = await this.fetchByIds(
      videoIds,
      YOUTUBE_DATA_API_MAX_RESULTS,
      (ids) => getVideos({ client: this.#client, ids }),
    )

    return { missingIds, videos: found }
  }

  /**
   * Requests only the `id` part instead of full videos, which makes checking
   * every saved video cheap enough for full sweeps.
   */
  override async findMissingVideoIds(
    videoIds: readonly string[],
  ): Promise<string[]> {
    const requestedIds = unique(videoIds)
    const foundIds = new Set(
      await this.fetchInBatches(
        requestedIds,
        YOUTUBE_DATA_API_MAX_RESULTS,
        (ids) => getVideoIds({ client: this.#client, ids }),
      ),
    )

    return requestedIds.filter((id) => !foundIds.has(id))
  }
}
