import type {
  RequestScheduler,
  TwitchClip,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
  TwitchVideoFilter,
  TwitchVideoPage,
} from '@shinju-date/twitch-api-client'
import type {
  FetcherOptions,
  RecentVideosOptions,
} from '../internal/fetcher-types.js'
import type { ScraperOptions } from '../types.js'

export type {
  TwitchClip,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
  TwitchVideoFilter,
  TwitchVideoPage,
}

/**
 * The Helix calls a Twitch scraper makes. Defaults to the implementations of
 * `@shinju-date/twitch-api-client`; tests pass their own.
 *
 * Lookups by ID get every ID at once: they split the IDs into the batches one
 * request accepts and make each request through `schedule`, which bounds the
 * requests in flight.
 */
export interface TwitchApi {
  getClips: (options: {
    ids: string[]
    schedule?: RequestScheduler
  }) => AsyncIterable<TwitchClip>
  getStreamsByUserIds: (options: {
    schedule?: RequestScheduler
    userIds: string[]
  }) => AsyncIterable<TwitchStream>
  getUsers: (options: {
    ids: string[]
    schedule?: RequestScheduler
  }) => AsyncIterable<TwitchUser>
  getVideos: (options: {
    ids: string[]
    schedule?: RequestScheduler
  }) => AsyncIterable<TwitchVideo>
  getVideosByUser: (options: {
    limit?: number
    type?: TwitchVideoFilter
    userId: string
  }) => AsyncIterable<TwitchVideo>
  getVideosByUserPage: (options: {
    after?: string | undefined
    limit?: number
    type?: TwitchVideoFilter
    userId: string
  }) => Promise<TwitchVideoPage>
}

export interface TwitchFetcherOptions extends FetcherOptions {
  client?: TwitchApi | undefined
}

export interface TwitchScraperOptions extends ScraperOptions {
  /** Helix accessors. Defaults to `@shinju-date/twitch-api-client`. */
  client?: TwitchApi
}

export interface TwitchRecentVideosOptions extends RecentVideosOptions {
  /** Kind of video to list (default: `archive`). */
  type?: TwitchVideoFilter
}

export interface ClipLookupResult {
  clips: TwitchClip[]
  /** Requested IDs Helix did not return (deleted). */
  missingIds: string[]
}
