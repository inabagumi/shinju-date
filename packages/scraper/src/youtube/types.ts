import type { youtube_v3 as youtube } from '@googleapis/youtube'
import type {
  FilteredYouTubeChannel,
  FilteredYouTubeVideo,
} from '@shinju-date/youtube-api-client'
import type { FetcherOptions } from '../internal/fetcher-types.js'
import type { ScraperOptions } from '../types.js'

export type YouTubeChannel = FilteredYouTubeChannel
export type YouTubeVideo = FilteredYouTubeVideo

export interface YouTubeFetcherOptions extends FetcherOptions {
  /** YouTube Data API client. Defaults to the shared API-key client. */
  client?: youtube.Youtube | undefined
}

export interface YouTubeScraperOptions extends ScraperOptions {
  /** YouTube Data API client. Defaults to the shared API-key client. */
  client?: youtube.Youtube
}

/** One page of a channel's uploads, newest first. */
export interface UploadPage {
  /** Where the next page starts, or `null` when this was the last one. */
  cursor: string | null
  videoIds: string[]
}
