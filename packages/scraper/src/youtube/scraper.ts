import type { Temporal } from 'temporal-polyfill'
import { Scraper } from '../scraper.js'
import type { AddPastVideosOptions, AddPastVideosResult } from '../types.js'
import { addNewYouTubeVideos } from './add-new-videos.js'
import { addPastYouTubeVideos } from './add-past-videos.js'
import {
  refreshYouTubeVideos,
  removeUnavailableYouTubeVideos,
} from './check-videos.js'
import { YouTubeFetcher } from './fetcher.js'
import { syncYouTubeChannels } from './sync-accounts.js'
import type { YouTubeScraperOptions } from './types.js'

/**
 * Keeps YouTube videos and channels in the database in sync with YouTube.
 *
 * YouTube lists scheduled and live broadcasts among a channel's uploads, so
 * they are discovered by `addNewVideos` like any other video and followed by
 * `refreshLiveVideos` until they end.
 */
export class YouTubeScraper extends Scraper {
  readonly provider = 'youtube'

  readonly #fetcher: YouTubeFetcher

  constructor({ client, concurrency, ...options }: YouTubeScraperOptions) {
    super(options)

    this.#fetcher = new YouTubeFetcher({
      client,
      concurrency,
      logger: options.logger,
    })
  }

  async addNewVideos(now?: Temporal.Instant): Promise<boolean> {
    return (await addNewYouTubeVideos(this.#context(now))) > 0
  }

  /**
   * Follows scheduled and live videos: reschedules, starts, title changes and
   * endings. Videos YouTube no longer returns are soft-deleted.
   */
  async refreshLiveVideos(now?: Temporal.Instant): Promise<boolean> {
    return (await refreshYouTubeVideos(this.#context(now), 'live')) > 0
  }

  async refreshRecentVideos(now?: Temporal.Instant): Promise<boolean> {
    return (await refreshYouTubeVideos(this.#context(now), 'recent')) > 0
  }

  async removeUnavailableVideos(now?: Temporal.Instant): Promise<boolean> {
    return (await removeUnavailableYouTubeVideos(this.#context(now))) > 0
  }

  async syncAccounts(now?: Temporal.Instant): Promise<boolean> {
    return (await syncYouTubeChannels(this.#context(now))) > 0
  }

  addPastVideos({
    now,
    ...options
  }: AddPastVideosOptions): Promise<AddPastVideosResult> {
    return addPastYouTubeVideos(this.#context(now), options)
  }

  #context(now: Temporal.Instant | undefined) {
    return this.createContext(this.#fetcher, now)
  }
}
