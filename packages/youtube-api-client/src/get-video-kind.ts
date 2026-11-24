import type { youtube_v3 as youtube } from "@googleapis/youtube";
import type { Enums } from "@shinju-date/database";

/** The `video_kind` enum of the database. */
export type YouTubeVideoKind = Enums<"video_kind">;

/**
 * Determines the kind/type of a YouTube video.
 *
 * Video kind classification:
 * - stream: Live streams (scheduled, on air or ended) and premieres, i.e.
 *   videos with liveStreamingDetails, whatever their duration
 * - short: Short-form videos (≤180 seconds / 3 minutes), including YouTube Shorts
 * - standard: Regular videos
 *
 * YouTube Shorts definition:
 * YouTube Shorts are videos with a maximum duration of 3 minutes (180 seconds).
 * We classify any video ≤180 seconds as 'short' for compatibility with
 * YouTube Shorts and future short-form platforms (TikTok, Instagram Reels, etc.).
 *
 * @param video - YouTube video object with contentDetails and
 *   liveStreamingDetails
 * @returns The video kind classification
 */
export const getVideoKind = (video: youtube.Schema$Video): YouTubeVideoKind => {
  const { contentDetails, liveStreamingDetails } = video;

  // Live streams and premieres are told apart before the duration: a
  // scheduled broadcast has no duration yet, and a short one is still a
  // broadcast. `getVideoStatus` reads the same details.
  if (liveStreamingDetails) {
    return "stream";
  }

  // Check duration for short-form content
  // YouTube Shorts are videos up to 3 minutes (180 seconds)
  if (contentDetails?.duration) {
    try {
      const duration = Temporal.Duration.from(contentDetails.duration);
      const totalSeconds = duration.total({ unit: "second" });

      // Classify as short if 180 seconds or less (but greater than 0)
      // Exclude 0-second videos (e.g., 'P0D') as they're likely placeholders
      if (totalSeconds > 0 && totalSeconds <= 180) {
        return "short";
      }
    } catch {
      // If duration parsing fails, default to standard
      // This handles edge cases like malformed durations
    }
  }

  // Default to standard for all other cases
  return "standard";
};
