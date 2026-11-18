import { TIME_ZONE } from "@shinju-date/constants";

interface DatedVideo {
  published_at: string;
}

interface GroupVideosByDateOptions {
  /**
   * Sort the videos by the start first. Pass `false` when they are already in
   * order (such as the search results, which are from the newest), and the
   * dates and the videos of each date keep that order.
   */
  sort?: boolean | undefined;
}

/**
 * Group the videos by the date (`YYYY-MM-DD` in `TIME_ZONE`) they start on.
 * The dates and the videos of each date are in the order of the start, or in
 * the given order with `sort: false`.
 */
export function groupVideosByDate<T extends DatedVideo>(
  videos: readonly T[],
  { sort = true }: GroupVideosByDateOptions = {}
): Map<string, T[]> {
  const sortedVideos = sort
    ? videos.toSorted((videoA, videoB) =>
        Temporal.Instant.compare(
          Temporal.Instant.from(videoA.published_at),
          Temporal.Instant.from(videoB.published_at)
        )
      )
    : videos;

  return Map.groupBy(sortedVideos, (video) =>
    Temporal.Instant.from(video.published_at)
      .toZonedDateTimeISO(TIME_ZONE)
      .toPlainDate()
      .toString()
  );
}
