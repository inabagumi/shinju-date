import type { youtube_v3 as youtube } from '@googleapis/youtube'
import type Database from '@shinju-date/database'
import { Temporal } from 'temporal-polyfill'

type VideoKind = Database['public']['Enums']['video_kind']

/**
 * Determines the kind/type of a YouTube video based on its duration.
 *
 * Video kind classification:
 * - short: Short-form videos (≤180 seconds / 3 minutes), including YouTube Shorts
 * - standard: Regular videos
 *
 * YouTube Shorts definition:
 * YouTube Shorts are videos with a maximum duration of 3 minutes (180 seconds).
 * We classify any video ≤180 seconds as 'short' for compatibility with
 * YouTube Shorts and future short-form platforms (TikTok, Instagram Reels, etc.).
 *
 * @param video - YouTube video object with contentDetails
 * @returns The video kind classification
 */
export function getVideoKind(video: youtube.Schema$Video): VideoKind {
  const { contentDetails } = video

  // Check duration for short-form content
  // YouTube Shorts are videos up to 3 minutes (180 seconds)
  if (contentDetails?.duration) {
    try {
      const duration = Temporal.Duration.from(contentDetails.duration)
      const totalSeconds = duration.total({ unit: 'second' })

      // Classify as short if 180 seconds or less (but greater than 0)
      // Exclude 0-second videos (e.g., 'P0D') as they're likely placeholders
      if (totalSeconds > 0 && totalSeconds <= 180) {
        return 'short'
      }
    } catch {
      // If duration parsing fails, default to standard
      // This handles edge cases like malformed durations
    }
  }

  // Default to standard for all other cases
  return 'standard'
}
