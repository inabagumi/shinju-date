import { youtube_v3 as youtube } from '@googleapis/youtube'
import PQueue from 'p-queue'
import { APIKeyError } from './errors/index.js'
import type {
  GetChannelsOptions,
  GetPlaylistItemsOptions,
  GetVideosOptions,
  ScrapeChannelsOptions,
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
  #apiKey: string
  #client: youtube.Youtube
  #queue: PQueue
  #onChannel: ((channel: YouTubeChannel) => void | Promise<void>) | undefined
  #onPlaylistItem:
    | ((item: YouTubePlaylistItem) => void | Promise<void>)
    | undefined
  #onVideo: ((video: YouTubeVideo) => void | Promise<void>) | undefined

  constructor(options: ScraperOptions) {
    if (!options.apiKey) {
      throw new APIKeyError()
    }

    this.#apiKey = options.apiKey
    this.#client = new youtube.Youtube({
      auth: this.#apiKey,
      fetchImplementation: fetch,
    })
    this.#queue = new PQueue({
      concurrency: 5,
      interval: 100,
    })
    this.#onChannel = options.onChannel
    this.#onPlaylistItem = options.onPlaylistItem
    this.#onVideo = options.onVideo
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
        if (this.#onChannel) {
          await this.#onChannel(channel)
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
        if (this.#onPlaylistItem) {
          await this.#onPlaylistItem(item)
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
        if (this.#onVideo) {
          await this.#onVideo(video)
        }
        yield video
      }
    }
  }

  async scrapeChannels({
    channelIDs,
  }: ScrapeChannelsOptions): Promise<YouTubeChannel[]> {
    const channels: YouTubeChannel[] = []

    for await (const channel of this.getChannels({ ids: channelIDs })) {
      channels.push(channel)
    }

    return channels
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

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#queue.onIdle()
  }
}
