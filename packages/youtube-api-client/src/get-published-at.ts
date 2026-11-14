import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { Temporal } from 'temporal-polyfill'

/**
 * Extracts the published date from a YouTube video.
 * Prefers actual start time for live streams, then scheduled start time,
 * and falls back to the snippet's published date.
 *
 * @param video - The YouTube video object
 * @returns The published date as a Temporal.Instant
 */
export function getPublishedAt(
  video: youtube.Schema$Video,
): Temporal.Instant | null {
  const publishedAt =
    video.liveStreamingDetails?.actualStartTime ??
    video.liveStreamingDetails?.scheduledStartTime ??
    video.snippet?.publishedAt

  return publishedAt ? Temporal.Instant.from(publishedAt) : null
}
