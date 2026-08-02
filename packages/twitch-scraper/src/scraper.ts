import {
  getClips as defaultGetClips,
  getUsers as defaultGetUsers,
  getVideos as defaultGetVideos,
  getVideosByUser as defaultGetVideosByUser,
  TWITCH_API_MAX_RESULTS,
} from '@shinju-date/twitch-api-client'
import PQueue from 'p-queue'
import type {
  AvailabilityResult,
  Logger,
  ScrapeClipsParams,
  ScrapeNewVideosParams,
  ScraperOptions,
  ScrapeUsersParams,
  ScrapeVideosAvailabilityParams,
  ScrapeVideosParams,
  TwitchClip,
  TwitchScraperClient,
  TwitchUser,
  TwitchVideo,
} from './types.js'

const defaultClient: TwitchScraperClient = {
  getClips: defaultGetClips,
  getUsers: defaultGetUsers,
  getVideos: defaultGetVideos,
  getVideosByUser: defaultGetVideosByUser,
}

/**
 * Orchestrates Twitch Helix fetches for batch jobs (mirrors {@link YouTubeScraper}).
 *
 * Uses callback-based APIs so callers can persist incrementally and control
 * concurrency via an internal queue.
 */
export class TwitchScraper implements AsyncDisposable {
  #client: TwitchScraperClient
  #logger: Logger | undefined
  #queue: PQueue

  constructor(options: ScraperOptions = {}) {
    this.#client = options.client ?? defaultClient
    this.#logger = options.logger
    this.#queue = new PQueue({
      concurrency: options.concurrency ?? 5,
      interval: options.interval ?? 100,
    })
  }

  /**
   * Fetch Twitch users by Helix user ID (like YouTube scrapeChannels).
   */
  async scrapeUsers(
    params: ScrapeUsersParams,
    onUsersScraped: (users: TwitchUser[]) => void | Promise<void>,
  ): Promise<void> {
    this.#logger?.debug('Scraping Twitch users', {
      count: params.userIds.length,
    })

    if (params.userIds.length === 0) {
      return
    }

    const users = await Array.fromAsync(
      this.#client.getUsers({ ids: params.userIds }),
    )

    this.#logger?.debug('Twitch user scraping completed', {
      count: users.length,
    })

    if (users.length > 0) {
      await onUsersScraped(users)
    }
  }

  /**
   * Fetch videos (VOD / highlight / upload) by ID.
   */
  async scrapeVideos(
    params: ScrapeVideosParams,
    onVideosScraped: (videos: TwitchVideo[]) => void | Promise<void>,
  ): Promise<void> {
    this.#logger?.debug('Scraping Twitch videos', {
      count: params.ids.length,
    })

    if (params.ids.length === 0) {
      return
    }

    const videos = await Array.fromAsync(
      this.#client.getVideos({ ids: params.ids }),
    )

    this.#logger?.debug('Twitch video scraping completed', {
      count: videos.length,
    })

    if (videos.length > 0) {
      await onVideosScraped(videos)
    }
  }

  /**
   * Fetch clips by ID (slug).
   */
  async scrapeClips(
    params: ScrapeClipsParams,
    onClipsScraped: (clips: TwitchClip[]) => void | Promise<void>,
  ): Promise<void> {
    this.#logger?.debug('Scraping Twitch clips', {
      count: params.ids.length,
    })

    if (params.ids.length === 0) {
      return
    }

    const clips = await Array.fromAsync(
      this.#client.getClips({ ids: params.ids }),
    )

    this.#logger?.debug('Twitch clip scraping completed', {
      count: clips.length,
    })

    if (clips.length > 0) {
      await onClipsScraped(clips)
    }
  }

  /**
   * Discover recent videos for each broadcaster (like YouTube scrapeNewVideos).
   * Defaults to the first page of archives per user for high-frequency discovery.
   */
  async scrapeNewVideos(
    params: ScrapeNewVideosParams,
    onNewVideos: (
      userId: string,
      videos: TwitchVideo[],
    ) => void | Promise<void>,
  ): Promise<void> {
    this.#logger?.debug('Scraping new Twitch videos', {
      count: params.userIds.length,
      type: params.type ?? 'archive',
    })

    await Promise.all(
      params.userIds.map((userId) =>
        this.#queue.add(async () => {
          const videos = await Array.fromAsync(
            this.#client.getVideosByUser({
              all: params.all ?? false,
              type: params.type ?? 'archive',
              userId,
            }),
          )

          if (videos.length > 0) {
            await onNewVideos(userId, videos)
          }
        }),
      ),
    )

    this.#logger?.debug('New Twitch video scraping completed')
  }

  /**
   * Check whether videos / clips still exist on Twitch.
   * Helix omits missing IDs from the response, so absence means unavailable.
   */
  async scrapeVideosAvailability(
    params: ScrapeVideosAvailabilityParams,
    onChecked: (results: AvailabilityResult[]) => void | Promise<void>,
  ): Promise<void> {
    const videoIds = params.videoIds ?? []
    const clipIds = params.clipIds ?? []

    this.#logger?.debug('Checking Twitch video availability', {
      clips: clipIds.length,
      videos: videoIds.length,
    })

    for (let i = 0; i < videoIds.length; i += TWITCH_API_MAX_RESULTS) {
      const batchIds = videoIds.slice(i, i + TWITCH_API_MAX_RESULTS)
      const found = await Array.fromAsync(
        this.#client.getVideos({ ids: batchIds }),
      )
      const available = new Set(found.map((video) => video.id))

      await onChecked(
        batchIds.map((id) => ({
          id,
          isAvailable: available.has(id),
        })),
      )
    }

    for (let i = 0; i < clipIds.length; i += TWITCH_API_MAX_RESULTS) {
      const batchIds = clipIds.slice(i, i + TWITCH_API_MAX_RESULTS)
      const found = await Array.fromAsync(
        this.#client.getClips({ ids: batchIds }),
      )
      const available = new Set(found.map((clip) => clip.id))

      await onChecked(
        batchIds.map((id) => ({
          id,
          isAvailable: available.has(id),
        })),
      )
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#queue.onIdle()
  }
}
