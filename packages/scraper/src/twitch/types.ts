import type {
  TwitchClip,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from '@shinju-date/twitch-api-client'
import type {
  FetcherOptions,
  RecentVideosOptions,
} from '../internal/fetcher-types.js'
import type { ScraperOptions } from '../types.js'

export type { TwitchClip, TwitchStream, TwitchUser, TwitchVideo }

export type TwitchVideoFilter = 'archive' | 'highlight' | 'upload' | 'all'

/**
 * The Helix calls a Twitch scraper makes. Defaults to the implementations of
 * `@shinju-date/twitch-api-client`; tests pass their own.
 */
export interface TwitchApi {
  getClips: (options: { ids: string[] }) => AsyncIterable<TwitchClip>
  getStreamsByUserIds: (options: {
    userIds: string[]
  }) => AsyncIterable<TwitchStream>
  getUsers: (options: { ids: string[] }) => AsyncIterable<TwitchUser>
  getVideos: (options: { ids: string[] }) => AsyncIterable<TwitchVideo>
  getVideosByUser: (options: {
    limit?: number
    type?: TwitchVideoFilter
    userId: string
  }) => AsyncIterable<TwitchVideo>
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
