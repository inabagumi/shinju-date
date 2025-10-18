import type { youtube_v3 as youtube } from '@googleapis/youtube'
import PQueue from 'p-queue'
import type {
  GetChannelsOptions,
  GetPlaylistItemsOptions,
  GetVideosOptions,
  ScraperOptions,
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
  #onChannelScraped:
    | ((channel: YouTubeChannel) => void | Promise<void>)
    | undefined
  #onPlaylistItemScraped:
    | ((item: YouTubePlaylistItem) => void | Promise<void>)
    | undefined
  #onVideoScraped: ((video: YouTubeVideo) => void | Promise<void>) | undefined
  #onVideoChecked:
    | ((video: { id: string; isAvailable: boolean }) => Promise<void>)
    | undefined

  constructor(options: ScraperOptions) {
    if (!options.youtubeClient) {
      throw new TypeError('youtubeClient is required')
    }

    this.#client = options.youtubeClient
    this.#queue = new PQueue({
      concurrency: 5,
      interval: 100,
    })
    this.#onChannelScraped = options.onChannelScraped
    this.#onPlaylistItemScraped = options.onPlaylistItemScraped
    this.#onVideoScraped = options.onVideoScraped
    this.#onVideoChecked = options.onVideoChecked
  }

  async *getChannels({
    ids,
  }: GetChannelsOptions): AsyncGenerator<YouTubeChannel, void, undefined> {
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
        if (this.#onChannelScraped) {
          await this.#onChannelScraped(channel)
        }
        yield channel
      }
    }
  }

  async *getPlaylistItems({
    all = false,
    playlistID,
  }: GetPlaylistItemsOptions): AsyncGenerator<
    YouTubePlaylistItem,
    void,
    undefined
  > {
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
        if (this.#onPlaylistItemScraped) {
          await this.#onPlaylistItemScraped(item)
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
  }: GetVideosOptions): AsyncGenerator<YouTubeVideo, void, undefined> {
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
        if (this.#onVideoScraped) {
          await this.#onVideoScraped(video)
        }
        yield video
      }
    }
  }

  async scrapeChannels(channelIds: string[]): Promise<void> {
    for await (const _channel of this.getChannels({ ids: channelIds })) {
      // Channel is already handled via onChannelScraped callback
    }
  }

  async scrapeVideos({
    playlistID,
    scrapeAll = false,
  }: ScrapeVideosOptions): Promise<YouTubeVideo[]> {
    const videoIDs: string[] = []

    for await (const playlistItem of this.getPlaylistItems({
      all: scrapeAll,
      playlistID,
    })) {
      videoIDs.push(playlistItem.contentDetails.videoId)
    }

    const videos: YouTubeVideo[] = []

    for await (const video of this.getVideos({ ids: videoIDs })) {
      videos.push(video)
    }

    return videos
  }

  async scrapePlaylistVideos(playlistId: string): Promise<void> {
    const videoIDs: string[] = []

    for await (const playlistItem of this.getPlaylistItems({
      all: false,
      playlistID: playlistId,
    })) {
      videoIDs.push(playlistItem.contentDetails.videoId)
    }

    for await (const _video of this.getVideos({ ids: videoIDs })) {
      // Video is already handled via onVideoScraped callback
    }
  }

  async checkVideos(videoIds: string[]): Promise<void> {
    for (let i = 0; i < videoIds.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
      const batchIds = videoIds.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS)

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
        if (this.#onVideoChecked) {
          await this.#onVideoChecked({
            id: videoId,
            isAvailable: availableVideoIds.has(videoId),
          })
        }
      }
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#queue.onIdle()
  }
}
