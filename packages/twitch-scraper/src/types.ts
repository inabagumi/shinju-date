import type {
  TwitchClip,
  TwitchUser,
  TwitchVideo,
} from '@shinju-date/twitch-api-client'

export type { TwitchClip, TwitchUser, TwitchVideo }

export interface Logger {
  debug(message: string, attributes?: Record<string, unknown>): void
  error(message: string, attributes?: Record<string, unknown>): void
  info(message: string, attributes?: Record<string, unknown>): void
  warn(message: string, attributes?: Record<string, unknown>): void
}

/**
 * Injectable Helix accessors for tests and alternate clients.
 * Defaults to `@shinju-date/twitch-api-client` implementations.
 */
export interface TwitchScraperClient {
  getClips: (options: {
    ids: string[]
  }) => AsyncGenerator<TwitchClip, void, undefined>
  getUsers: (options: {
    ids?: string[]
    logins?: string[]
  }) => AsyncGenerator<TwitchUser, void, undefined>
  getVideos: (options: {
    ids: string[]
  }) => AsyncGenerator<TwitchVideo, void, undefined>
  getVideosByUser: (options: {
    userId: string
    type?: 'archive' | 'highlight' | 'upload' | 'all'
    all?: boolean
  }) => AsyncGenerator<TwitchVideo, void, undefined>
}

export interface ScraperOptions {
  client?: TwitchScraperClient
  concurrency?: number
  interval?: number
  logger?: Logger
}

export interface ScrapeUsersParams {
  userIds: string[]
}

export interface ScrapeNewVideosParams {
  /** Helix user IDs (broadcaster IDs) */
  userIds: string[]
  type?: 'archive' | 'highlight' | 'upload' | 'all'
  /** Drain all pages when true (default: first page only) */
  all?: boolean
}

export interface ScrapeVideosParams {
  ids: string[]
}

export interface ScrapeClipsParams {
  ids: string[]
}

export interface ScrapeVideosAvailabilityParams {
  /** Twitch video IDs (archive / highlight / upload) */
  videoIds?: string[]
  /** Twitch clip IDs (slugs) */
  clipIds?: string[]
}

export interface AvailabilityResult {
  id: string
  isAvailable: boolean
}
