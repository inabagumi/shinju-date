import { Temporal } from 'temporal-polyfill'
import type { YouTubeVideo } from './types'

/**
 * Extracts the published date from a YouTube video.
 * Prefers actual start time for live streams, then scheduled start time,
 * and falls back to the snippet's published date.
 *
 * @param video - The YouTube video object
 * @returns The published date as a Temporal.Instant
 */
export function getPublishedAt(video: YouTubeVideo): Temporal.Instant {
  const publishedAt =
    video.liveStreamingDetails?.actualStartTime ??
    video.liveStreamingDetails?.scheduledStartTime ??
    video.snippet.publishedAt

  return Temporal.Instant.from(publishedAt)
}
