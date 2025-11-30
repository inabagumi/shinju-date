import type { youtube_v3 as youtube } from '@googleapis/youtube'
import type { Tables } from '@shinju-date/database'
import { Temporal } from 'temporal-polyfill'

type VideoStatus = Tables<'videos'>['status']

/**
 * Determines the status of a YouTube video based on its live streaming details.
 *
 * Status meanings:
 * - PUBLISHED: Regular published videos (not live streams or premieres)
 * - UPCOMING: Scheduled live streams or premieres that haven't started yet
 * - LIVE: Currently live streaming
 * - ENDED: Live streams that have finished
 *
 * Note on YouTube Premieres (プレミア公開):
 * YouTube premieres are videos that are scheduled for a future release date/time.
 * They have liveStreamingDetails.scheduledStartTime set, making them appear as
 * "UPCOMING" until the premiere time arrives. After the premiere, they become
 * regular published videos and will be marked as "ENDED" (since they had
 * liveStreamingDetails). This is the correct behavior as premieres are treated
 * similarly to live streams in YouTube's API.
 */
export function getVideoStatus(
  { liveStreamingDetails: details }: youtube.Schema$Video,
  currentDateTime = Temporal.Now.instant(),
): VideoStatus {
  // If no liveStreamingDetails, it's a regular published video (not a live stream)
  if (!details) return 'PUBLISHED'

  // Currently live (has actualStartTime but no actualEndTime)
  if (details.actualStartTime && !details.actualEndTime) {
    return 'LIVE'
  }

  // Scheduled for future (has scheduledStartTime in the future)
  if (
    details.scheduledStartTime &&
    Temporal.Instant.compare(
      Temporal.Instant.from(details.scheduledStartTime),
      currentDateTime,
    ) > 0
  ) {
    return 'UPCOMING'
  }

  // Live stream that has ended
  return 'ENDED'
}
