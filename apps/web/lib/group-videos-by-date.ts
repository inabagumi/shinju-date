import { TIME_ZONE } from '@shinju-date/constants'

interface DatedVideo {
  published_at: string
}

/**
 * Group the videos by the date (`YYYY-MM-DD` in `TIME_ZONE`) they start on.
 * The dates and the videos of each date are in the order of the start.
 */
export function groupVideosByDate<T extends DatedVideo>(
  videos: readonly T[],
): Map<string, T[]> {
  const sortedVideos = videos.toSorted((videoA, videoB) =>
    Temporal.Instant.compare(
      Temporal.Instant.from(videoA.published_at),
      Temporal.Instant.from(videoB.published_at),
    ),
  )

  return Map.groupBy(sortedVideos, (video) =>
    Temporal.Instant.from(video.published_at)
      .toZonedDateTimeISO(TIME_ZONE)
      .toPlainDate()
      .toString(),
  )
}
