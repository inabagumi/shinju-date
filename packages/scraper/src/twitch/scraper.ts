import type { Temporal } from 'temporal-polyfill'
import { Scraper } from '../scraper.js'
import type { AddPastVideosOptions, AddPastVideosResult } from '../types.js'
import { addNewTwitchVideos } from './add-new-videos.js'
import { addPastTwitchVideos } from './add-past-videos.js'
import {
  refreshRecentTwitchVideos,
  removeUnavailableTwitchVideos,
} from './check-videos.js'
import { TwitchFetcher } from './fetcher.js'
import { syncTwitchUsers } from './sync-accounts.js'
import { syncTwitchLive } from './sync-live.js'
import type { TwitchScraperOptions } from './types.js'

/**
 * Keeps Twitch videos and accounts in the database in sync with Twitch.
 *
 * Twitch has no scheduled broadcasts to register in advance and only creates
 * an archive once a stream is on air, so broadcasts are discovered by
 * `refreshLiveVideos`: it adds a LIVE row when a stream starts and ends it
 * when the stream goes offline. `addNewVideos` then attaches the archive to
 * that row instead of saving it a second time.
 */
export class TwitchScraper extends Scraper {
  readonly provider = 'twitch'

  readonly #fetcher: TwitchFetcher

  constructor({ client, concurrency, ...options }: TwitchScraperOptions) {
    super(options)

    this.#fetcher = new TwitchFetcher({
      client,
      concurrency,
      logger: options.logger,
    })
  }

  /**
   * Saves archives and uploads that are not saved yet. The archive of a
   * broadcast that is already tracked is attached to its row.
   */
  async addNewVideos(now?: Temporal.Instant): Promise<boolean> {
    return (await addNewTwitchVideos(this.#context(now))) > 0
  }

  /**
   * Follows the streams that are on air: adds a LIVE row when a stream
   * starts, follows title changes and ends the row when it goes offline.
   */
  async refreshLiveVideos(now?: Temporal.Instant): Promise<boolean> {
    return (await syncTwitchLive(this.#context(now))) > 0
  }

  async refreshRecentVideos(now?: Temporal.Instant): Promise<boolean> {
    return (await refreshRecentTwitchVideos(this.#context(now))) > 0
  }

  async removeUnavailableVideos(now?: Temporal.Instant): Promise<boolean> {
    return (await removeUnavailableTwitchVideos(this.#context(now))) > 0
  }

  async syncAccounts(now?: Temporal.Instant): Promise<boolean> {
    return (await syncTwitchUsers(this.#context(now))) > 0
  }

  addPastVideos({
    now,
    ...options
  }: AddPastVideosOptions): Promise<AddPastVideosResult> {
    return addPastTwitchVideos(this.#context(now), options)
  }

  #context(now: Temporal.Instant | undefined) {
    return this.createContext(this.#fetcher, now)
  }
}
