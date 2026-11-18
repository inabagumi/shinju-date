import { toDBString } from "@shinju-date/temporal-fns";
import {
  getPublishedAt,
  getVideoKind,
  getVideoStatus,
} from "@shinju-date/youtube-api-client";

import type { ThumbnailSource } from "../internal/thumbnails/index.js";
import type { VideoFields } from "../types.js";
import type { YouTubeVideo } from "./types.js";

/**
 * Maps a YouTube video to the columns we keep in sync with YouTube.
 */
export const toVideoFields = (
  video: YouTubeVideo,
  now: Temporal.Instant
): VideoFields => {
  const publishedAt =
    getPublishedAt(video) ?? Temporal.Instant.from(video.snippet.publishedAt);

  return {
    duration: video.contentDetails.duration ?? "P0D",
    published_at: toDBString(publishedAt),
    status: getVideoStatus(video, now),
    title: video.snippet.title ?? "",
    video_kind: getVideoKind(video),
  };
};

/**
 * Picks the best thumbnail YouTube offers for a video, if any.
 */
export const getThumbnailSource = (
  video: YouTubeVideo
): ThumbnailSource | null => {
  const { thumbnails } = video.snippet;
  const thumbnail =
    thumbnails?.maxres ?? thumbnails?.standard ?? thumbnails?.high;

  if (!thumbnail?.url || !thumbnail.width || !thumbnail.height) {
    return null;
  }

  return {
    height: thumbnail.height,
    url: thumbnail.url,
    width: thumbnail.width,
  };
};
