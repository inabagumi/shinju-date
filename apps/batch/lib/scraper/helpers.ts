import { Temporal } from 'temporal-polyfill'
import type { FilteredYouTubeVideo } from '@/lib/youtube'

export function getPublishedAt(video: FilteredYouTubeVideo): Temporal.Instant {
  const publishedAt =
    video.liveStreamingDetails?.actualStartTime ??
    video.liveStreamingDetails?.scheduledStartTime ??
    video.snippet.publishedAt

  return Temporal.Instant.from(publishedAt)
}
