import type { youtube_v3 as youtube } from '@googleapis/youtube'
import PQueue from 'p-queue'
import type {
  GetChannelsOptions,
  GetPlaylistItemsOptions,
  GetVideosOptions,
  Logger,
  ScrapeNewVideosParams,
  ScraperOptions,
  ScrapeUpdatedVideosParams,
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

  async *getChannels(
    options: GetChannelsOptions,
  ): AsyncGenerator<YouTubeChannel, void, undefined> {
    for (let i = 0; i < options.ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
      const {
        data: { items },
      } = await this.#client.channels.list({
        id: options.ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
        maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
        part: ['contentDetails', 'id'],
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

  async *getPlaylistItems(
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

      if (validVideos.length > 0) {
        await onVideoScraped(validVideos)
      }
    }

    this.#logger?.debug('Video scraping completed')
  }

  async scrapeChannels(
    params: { channelIds: string[] },
    onChannelScraped: (channels: YouTubeChannel[]) => Promise<void>,
  ): Promise<void> {
    const channels: YouTubeChannel[] = []
    // Use AsyncIterator pattern to collect all channels
    for await (const channel of this.getChannels({ ids: params.channelIds })) {
      channels.push(channel)
    }

    if (channels.length > 0) {
      await onChannelScraped(channels)
    }
  }

  async scrapePlaylistVideos(
    params: { playlistId: string },
    callbacks: {
      onVideoScraped: (videos: YouTubeVideo[]) => Promise<void>
      onThumbnailScraped: (thumbnails: YouTubePlaylistItem[]) => Promise<void>
    },
  ): Promise<void> {
    const videoIDs: string[] = []
    const thumbnails: YouTubePlaylistItem[] = []

    for await (const playlistItem of this.getPlaylistItems({
      all: false,
      playlistID: params.playlistId,
    })) {
      thumbnails.push(playlistItem)
      videoIDs.push(playlistItem.contentDetails.videoId)
    }

    if (thumbnails.length > 0) {
      await callbacks.onThumbnailScraped(thumbnails)
    }

    // Now scrapeVideos calls callback with array
    await this.scrapeVideos({ ids: videoIDs }, callbacks.onVideoScraped)
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
    for await (const channel of this.getChannels({ ids: params.channelIds })) {
      const playlistId = channel.contentDetails.relatedPlaylists.uploads
      const videoIDs: string[] = []

      for await (const playlistItem of this.getPlaylistItems({
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

  /**
   * Scrape updated videos from channels
   * @param params - Parameters containing channelIds
   * @param onUpdatedVideos - Callback to handle batches of updated videos with channel context
   */
  async scrapeUpdatedVideos(
    params: ScrapeUpdatedVideosParams,
    onUpdatedVideos: (
      channelId: string,
      videos: YouTubeVideo[],
    ) => Promise<void>,
  ): Promise<void> {
    for await (const channel of this.getChannels({ ids: params.channelIds })) {
      const playlistId = channel.contentDetails.relatedPlaylists.uploads
      const videoIDs: string[] = []

      for await (const playlistItem of this.getPlaylistItems({
        all: true,
        playlistID: playlistId,
      })) {
        videoIDs.push(playlistItem.contentDetails.videoId)
      }

      const videos: YouTubeVideo[] = []
      await this.scrapeVideos({ ids: videoIDs }, async (videoBatch) => {
        videos.push(...videoBatch)
      })

      if (videos.length > 0) {
        await onUpdatedVideos(channel.id, videos)
      }
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#queue.onIdle()
  }
}
