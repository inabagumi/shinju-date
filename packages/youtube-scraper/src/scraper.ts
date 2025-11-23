import type { youtube_v3 as youtube } from '@googleapis/youtube'
import PQueue from 'p-queue'
import type {
  GetChannelsOptions,
  GetPlaylistItemsOptions,
  GetVideosOptions,
  Logger,
  ScrapeNewVideosParams,
  ScraperOptions,
  YouTubeChannel,
  YouTubePlaylistItem,
  YouTubeVideo,
} from './types/index.js'
import {
  isValidChannel,
  isValidPlaylistItem,
  isValidVideo,
  YOUTUBE_DATA_API_MAX_RESULTS,
} from './utils/helpers.js'

export class YouTubeScraper implements AsyncDisposable {
  #client: youtube.Youtube
  #queue: PQueue
  #logger: Logger | undefined

  constructor(options: ScraperOptions) {
    if (!options.youtubeClient) {
      throw new TypeError('youtubeClient is required')
    }

    this.#client = options.youtubeClient
    this.#queue = new PQueue({
      concurrency: options.concurrency ?? 5,
      interval: options.interval ?? 100,
    })
    this.#logger = options.logger
  }

  async *#getChannels(
    options: GetChannelsOptions,
  ): AsyncGenerator<YouTubeChannel, void, undefined> {
    for (let i = 0; i < options.ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
      const {
        data: { items },
      } = await this.#client.channels.list({
        id: options.ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
        maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
        part: ['contentDetails', 'id', 'snippet'],
      })

      if (!items || items.length < 1) {
        continue
      }

      const validChannels = items.filter(isValidChannel)

      for (const channel of validChannels) {
        yield channel
      }
    }
  }

  async *#getPlaylistItems(
    options: GetPlaylistItemsOptions,
  ): AsyncGenerator<YouTubePlaylistItem, void, undefined> {
    let pageToken: string | undefined
    const all = options.all ?? false

    while (true) {
      const {
        data: { items, nextPageToken },
      } = await this.#client.playlistItems.list({
        maxResults: all ? YOUTUBE_DATA_API_MAX_RESULTS : 20,
        part: ['contentDetails'],
        playlistId: options.playlistID,
        ...(pageToken
          ? {
              pageToken,
            }
          : {}),
      })

      if (!items || items.length < 1) {
        break
      }

      const validItems = items.filter(isValidPlaylistItem)

      for (const item of validItems) {
        yield item
      }

      if (!all || !nextPageToken) {
        break
      }

      pageToken = nextPageToken
    }
  }

  async scrapeVideos(
    options: GetVideosOptions,
    onVideoScraped: (videos: YouTubeVideo[]) => void | Promise<void>,
  ): Promise<void> {
    this.#logger?.debug('Scraping videos', { count: options.ids.length })

    // Collect all videos first
    const allVideos: YouTubeVideo[] = []

    for (let i = 0; i < options.ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
      const {
        data: { items },
      } = await this.#client.videos.list({
        id: options.ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
        maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
        part: ['contentDetails', 'liveStreamingDetails', 'snippet'],
      })

      if (!items || items.length < 1) {
        continue
      }

      const validVideos = items.filter(isValidVideo)
      allVideos.push(...validVideos)
    }

    this.#logger?.debug('Video scraping completed')

    // Call callback once with all collected videos
    if (allVideos.length > 0) {
      await onVideoScraped(allVideos)
    }
  }

  async scrapeChannels(
    params: { channelIds: string[] },
    onChannelScraped: (channels: YouTubeChannel[]) => Promise<void>,
  ): Promise<void> {
    // Collect all channels into a single batch for the callback
    // Note: For very large channel lists (>1000), consider processing in smaller batches
    // However, typical usage in this codebase processes <100 channels, making this safe
    const channels: YouTubeChannel[] = []
    for await (const channel of this.#getChannels({ ids: params.channelIds })) {
      channels.push(channel)
    }

    if (channels.length > 0) {
      await onChannelScraped(channels)
    }
  }

  async scrapeVideosAvailability(
    params: { videoIds: string[] },
    onVideoChecked: (
      videos: {
        id: string
        isAvailable: boolean
      }[],
    ) => Promise<void>,
  ): Promise<void> {
    for (
      let i = 0;
      i < params.videoIds.length;
      i += YOUTUBE_DATA_API_MAX_RESULTS
    ) {
      const batchIds = params.videoIds.slice(
        i,
        i + YOUTUBE_DATA_API_MAX_RESULTS,
      )

      const {
        data: { items },
      } = await this.#client.videos.list({
        id: batchIds,
        maxResults: batchIds.length,
        part: ['id'],
      })

      const availableVideoIds = new Set(
        items?.filter((item) => item.id).map((item) => item.id as string) ?? [],
      )

      const results = batchIds.map((videoId) => ({
        id: videoId,
        isAvailable: availableVideoIds.has(videoId),
      }))

      await onVideoChecked(results)
    }
  }

  /**
   * Scrape new videos from channels
   * @param params - Parameters containing channelIds
   * @param onNewVideos - Callback to handle batches of new videos with channel context
   */
  async scrapeNewVideos(
    params: ScrapeNewVideosParams,
    onNewVideos: (channelId: string, videos: YouTubeVideo[]) => Promise<void>,
  ): Promise<void> {
    for await (const channel of this.#getChannels({ ids: params.channelIds })) {
      const playlistId = channel.contentDetails.relatedPlaylists.uploads
      const videoIDs: string[] = []

      for await (const playlistItem of this.#getPlaylistItems({
        all: false,
        playlistID: playlistId,
      })) {
        videoIDs.push(playlistItem.contentDetails.videoId)
      }

      const videos: YouTubeVideo[] = []
      await this.scrapeVideos({ ids: videoIDs }, async (videoBatch) => {
        videos.push(...videoBatch)
      })

      if (videos.length > 0) {
        await onNewVideos(channel.id, videos)
      }
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#queue.onIdle()
  }
}
