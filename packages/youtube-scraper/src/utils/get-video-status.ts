import type { youtube_v3 as youtube } from '@googleapis/youtube'
import type { Tables } from '@shinju-date/database'
import { Temporal } from 'temporal-polyfill'

type VideoStatus = Tables<'videos'>['status']

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
