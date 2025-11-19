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
      interval: 100,
    })
  }

  async *getChannels({
    ids,
    onChannelScraped,
  }: GetChannelsOptions & {
    onChannelScraped?: (channel: YouTubeChannel) => void | Promise<void>
  }): AsyncGenerator<YouTubeChannel, void, undefined> {
    for (let i = 0; i < ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
      const {
        data: { items },
      } = await this.#client.channels.list({
        id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
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

  async *getPlaylistItems({
    all = false,
    playlistID,
    onPlaylistItemScraped,
  }: GetPlaylistItemsOptions & {
    onPlaylistItemScraped?: (item: YouTubePlaylistItem) => void | Promise<void>
  }): AsyncGenerator<YouTubePlaylistItem, void, undefined> {
    let pageToken: string | undefined

    while (true) {
      const {
        data: { items, nextPageToken },
      } = await this.#client.playlistItems.list({
        maxResults: all ? YOUTUBE_DATA_API_MAX_RESULTS : 20,
        part: ['contentDetails'],
        playlistId: playlistID,
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

  async *getVideos({
    ids,
    onVideoScraped,
  }: GetVideosOptions & {
    onVideoScraped?: (video: YouTubeVideo) => void | Promise<void>
  }): AsyncGenerator<YouTubeVideo, void, undefined> {
    for (let i = 0; i < ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
      const {
        data: { items },
      } = await this.#client.videos.list({
        id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
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

  async scrapeChannels(options: {
    channelIds: string[]
    onChannelScraped: (channel: YouTubeChannel) => Promise<void>
  }): Promise<void> {
    // Consume the async iterator to trigger onChannelScraped callbacks
    await Array.fromAsync(
      this.getChannels({
        ids: options.channelIds,
        onChannelScraped: options.onChannelScraped,
      }),
    )
  }

  async scrapeVideos({
    playlistID,
    scrapeAll = false,
  }: ScrapeVideosOptions): Promise<YouTubeVideo[]> {
    const videoIDs = await Array.fromAsync(
      this.getPlaylistItems({
        all: scrapeAll,
        playlistID,
      }),
      (playlistItem) => playlistItem.contentDetails.videoId,
    )

    const videos = await Array.fromAsync(this.getVideos({ ids: videoIDs }))

    return videos
  }

  async scrapePlaylistVideos(options: {
    playlistId: string
    onVideoScraped: (video: YouTubeVideo) => Promise<void>
    onThumbnailScraped: (thumbnail: YouTubePlaylistItem) => Promise<void>
  }): Promise<void> {
    const videoIDs = await Array.fromAsync(
      this.getPlaylistItems({
        all: false,
        onPlaylistItemScraped: options.onThumbnailScraped,
        playlistID: options.playlistId,
      }),
      (playlistItem) => playlistItem.contentDetails.videoId,
    )

    // Consume the async iterator to trigger onVideoScraped callbacks
    await Array.fromAsync(
      this.getVideos({
        ids: videoIDs,
        onVideoScraped: options.onVideoScraped,
      }),
    )
  }

  async checkVideos(options: {
    videoIds: string[]
    onVideoChecked: (video: {
      id: string
      isAvailable: boolean
    }) => Promise<void>
  }): Promise<void> {
    for (
      let i = 0;
      i < options.videoIds.length;
      i += YOUTUBE_DATA_API_MAX_RESULTS
    ) {
      const batchIds = options.videoIds.slice(
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
        await options.onVideoChecked({
          id: videoId,
          isAvailable: availableVideoIds.has(videoId),
        })
      }
    }
  }

  /**
   * Scrape new videos from a playlist
   * @param params - Parameters containing playlistId
   * @param onNewVideos - Callback to handle batches of new videos
   */
  async scrapeNewVideos(
    params: ScrapeNewVideosParams,
    onNewVideos: (videos: YouTubeVideo[]) => Promise<void>,
  ): Promise<void> {
    const videoIDs = await Array.fromAsync(
      this.getPlaylistItems({
        all: false,
        playlistID: params.playlistId,
      }),
      (playlistItem) => playlistItem.contentDetails.videoId,
    )

    const videos = await Array.fromAsync(this.getVideos({ ids: videoIDs }))

    if (videos.length > 0) {
      await onNewVideos(videos)
    }
  }

  /**
   * Scrape updated videos from a playlist
   * @param params - Parameters containing playlistId
   * @param onUpdatedVideos - Callback to handle batches of updated videos
   */
  async scrapeUpdatedVideos(
    params: ScrapeUpdatedVideosParams,
    onUpdatedVideos: (videos: YouTubeVideo[]) => Promise<void>,
  ): Promise<void> {
    const videoIDs = await Array.fromAsync(
      this.getPlaylistItems({
        all: true,
        playlistID: params.playlistId,
      }),
      (playlistItem) => playlistItem.contentDetails.videoId,
    )

    const videos = await Array.fromAsync(this.getVideos({ ids: videoIDs }))

    if (videos.length > 0) {
      await onUpdatedVideos(videos)
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#queue.onIdle()
  }
}
