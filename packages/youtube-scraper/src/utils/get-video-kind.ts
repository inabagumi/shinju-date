import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { Temporal } from 'temporal-polyfill'

type VideoKind = 'standard' | 'short' | 'live_stream' | 'premiere'

/**
 * Determines the kind/type of a YouTube video based on its duration and live streaming details.
 *
 * Video kind classification:
 * - short: Short-form videos (≤60 seconds), including YouTube Shorts
 * - live_stream: Live streaming content (currently live or scheduled)
 * - premiere: Premiere videos (scheduled for future release)
 * - standard: Regular videos (including VODs and ended live streams)
 *
 * YouTube Shorts definition:
 * YouTube Shorts are vertical videos with a maximum duration of 60 seconds.
 * We classify any video ≤60 seconds as 'short' for broader compatibility with
 * future short-form platforms (TikTok, Instagram Reels, etc.).
 *
 * @param video - YouTube video object with contentDetails and liveStreamingDetails
 * @param currentDateTime - Current timestamp for comparison (defaults to now)
 * @returns The video kind classification
 */
export function getVideoKind(
  video: youtube.Schema$Video,
  currentDateTime = Temporal.Now.instant(),
): VideoKind {
  const { contentDetails, liveStreamingDetails: details } = video

  // Check if it's a live stream or premiere first (takes priority over duration)
  if (details) {
    // Currently live
    if (details.actualStartTime && !details.actualEndTime) {
      return 'live_stream'
    }

    // Scheduled for future (upcoming premiere or live stream)
    if (
      details.scheduledStartTime &&
      Temporal.Instant.compare(
        Temporal.Instant.from(details.scheduledStartTime),
        currentDateTime,
      ) > 0
    ) {
      return 'premiere'
    }

    // Live stream that has ended - treat as standard
    // (ended live streams are considered standard videos/VODs)
  }

  // Check duration for short-form content
  // YouTube Shorts and similar short-form content are ≤60 seconds
  if (contentDetails?.duration) {
    try {
      const duration = Temporal.Duration.from(contentDetails.duration)
      const totalSeconds = duration.total({ unit: 'second' })

      // Classify as short if 60 seconds or less (but greater than 0)
      // Exclude 0-second videos (e.g., 'P0D') as they're likely placeholders
      if (totalSeconds > 0 && totalSeconds <= 60) {
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
