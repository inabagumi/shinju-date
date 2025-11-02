import type { youtube_v3 as youtube } from '@googleapis/youtube'
import type { Tables } from '@shinju-date/database'
import { Temporal } from 'temporal-polyfill'

type VideoStatus = Tables<'videos'>['status']

export function getVideoStatus(
  { liveStreamingDetails: details }: youtube.Schema$Video,
  currentDateTime = Temporal.Now.instant(),
): VideoStatus {
  if (!details) return 'ENDED'

  if (details.actualStartTime && !details.actualEndTime) {
    return 'LIVE'
  }

  if (
    details.scheduledStartTime &&
    Temporal.Instant.compare(
      Temporal.Instant.from(details.scheduledStartTime),
      currentDateTime,
    ) > 0
  ) {
    return 'UPCOMING'
  }

  return 'ENDED'
}
