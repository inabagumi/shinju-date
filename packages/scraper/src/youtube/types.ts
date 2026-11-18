import type { youtube_v3 as youtube } from "@googleapis/youtube";
import type {
  FilteredYouTubeChannel,
  FilteredYouTubeVideo,
} from "@shinju-date/youtube-api-client";

import type {
  FetcherOptions,
  RecentVideosResult,
} from "../internal/fetcher-types.js";
import type { ScraperOptions } from "../types.js";

export type YouTubeChannel = FilteredYouTubeChannel;
export type YouTubeVideo = FilteredYouTubeVideo;

export interface YouTubeFetcherOptions extends FetcherOptions {
  /** YouTube Data API client. Defaults to the shared API-key client. */
  client?: youtube.Youtube | undefined;
}

export interface YouTubeScraperOptions extends ScraperOptions {
  /** YouTube Data API client. Defaults to the shared API-key client. */
  client?: youtube.Youtube;
}

/** One page of a channel's uploads, newest first. */
export interface UploadPage {
  /** Where the next page starts, or `null` when this was the last one. */
  cursor: string | null;
  videoIds: string[];
}

/**
 * A video in a channel's uploads playlist. Listing uploads tells only which
 * channel uploaded which video; the details are a separate request.
 */
export interface YouTubeUpload {
  channelId: string;
  videoId: string;
}

export interface YouTubeRecentVideosResult extends RecentVideosResult<YouTubeUpload> {
  /** Requested channels YouTube does not know (deleted or terminated). */
  missingAccountIds: string[];
}
