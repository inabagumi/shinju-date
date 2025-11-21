import type { youtube_v3 as youtube } from '@googleapis/youtube'
import PQueue from 'p-queue'
import type {
  GetChannelsOptions,
  GetPlaylistItemsOptions,
  GetVideosOptions,
  ScrapeNewVideosParams,
  ScraperOptions,
  ScrapeUpdatedVideosParams,
  ScrapeVideosOptions,
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

  constructor(options: ScraperOptions) {
    if (!options.youtubeClient) {
      throw new TypeError('youtubeClient is required')
    }

    this.#client = options.youtubeClient
    this.#queue = new PQueue({
      concurrency: options.concurrency ?? 5,
      interval: options.interval ?? 100,
    })
  }

  async *getChannels(
    options: GetChannelsOptions,
    onChannelScraped?: (channel: YouTubeChannel) => void | Promise<void>,
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
        if (onChannelScraped) {
          await onChannelScraped(channel)
        }
        yield channel
      }
    }
  }

  async *getPlaylistItems(
    options: GetPlaylistItemsOptions,
    onPlaylistItemScraped?: (item: YouTubePlaylistItem) => void | Promise<void>,
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
        if (onPlaylistItemScraped) {
          await onPlaylistItemScraped(item)
        }
        yield item
      }

      if (!all || !nextPageToken) {
        break
      }

      pageToken = nextPageToken
    }
  }

  async *getVideos(
    options: GetVideosOptions,
    onVideoScraped?: (video: YouTubeVideo) => void | Promise<void>,
  ): AsyncGenerator<YouTubeVideo, void, undefined> {
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

      for (const video of validVideos) {
        if (onVideoScraped) {
          await onVideoScraped(video)
        }
        yield video
      }
    }
  }

  async scrapeChannels(
    params: { channelIds: string[] },
    onChannelScraped: (channel: YouTubeChannel) => Promise<void>,
  ): Promise<void> {
    // Use AsyncIterator pattern instead of Array.fromAsync
    for await (const _channel of this.getChannels(
      { ids: params.channelIds },
      onChannelScraped,
    )) {
      // Channel is already processed via onChannelScraped callback
    }
  }

  async scrapeVideos(options: ScrapeVideosOptions): Promise<YouTubeVideo[]> {
    const videoIDs: string[] = []

    for await (const playlistItem of this.getPlaylistItems({
      all: options.scrapeAll ?? false,
      playlistID: options.playlistID,
    })) {
      videoIDs.push(playlistItem.contentDetails.videoId)
    }

    const videos: YouTubeVideo[] = []
    for await (const video of this.getVideos({ ids: videoIDs })) {
      videos.push(video)
    }

    return videos
  }

  async scrapePlaylistVideos(
    params: { playlistId: string },
    callbacks: {
      onVideoScraped: (video: YouTubeVideo) => Promise<void>
      onThumbnailScraped: (thumbnail: YouTubePlaylistItem) => Promise<void>
    },
  ): Promise<void> {
    const videoIDs: string[] = []

    for await (const playlistItem of this.getPlaylistItems(
      { all: false, playlistID: params.playlistId },
      callbacks.onThumbnailScraped,
    )) {
      videoIDs.push(playlistItem.contentDetails.videoId)
    }

    // Use AsyncIterator to trigger onVideoScraped callbacks
    for await (const _video of this.getVideos(
      { ids: videoIDs },
      callbacks.onVideoScraped,
    )) {
      // Video is already processed via onVideoScraped callback
    }
  }

  async checkVideos(
    params: { videoIds: string[] },
    onVideoChecked: (video: {
      id: string
      isAvailable: boolean
    }) => Promise<void>,
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

      for (const videoId of batchIds) {
        await onVideoChecked({
          id: videoId,
          isAvailable: availableVideoIds.has(videoId),
        })
      }
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
      for await (const video of this.getVideos({ ids: videoIDs })) {
        videos.push(video)
      }

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
      for await (const video of this.getVideos({ ids: videoIDs })) {
        videos.push(video)
      }

      if (videos.length > 0) {
        await onUpdatedVideos(channel.id, videos)
      }
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#queue.onIdle()
  }
}
