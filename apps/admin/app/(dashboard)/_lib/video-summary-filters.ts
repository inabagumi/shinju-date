import { PUBLIC_VIDEO_STATUSES } from "@shinju-date/dashboard-stats";
import type { Tables } from "@shinju-date/database";

type VideoStatus = Tables<"videos">["status"];

/**
 * The conditions of a tile of the video summary, which filter the video list
 * that the tile links to. They are the conditions that `countSummaryStats` of
 * `@shinju-date/dashboard-stats` counts the tile with, so that the number of
 * the tile matches the videos of the list.
 */
export interface VideoSummaryFilter {
  /** List the deleted videos (`true`) or the videos not deleted (`false`) */
  deleted: boolean;
  status?: readonly VideoStatus[];
  visible?: boolean;
}

export type VideoSummaryTile =
  | "totalVideos"
  | "visibleVideos"
  | "scheduledVideos"
  | "hiddenVideos"
  | "deletedVideos";

export const VIDEO_SUMMARY_FILTERS = {
  deletedVideos: { deleted: true },
  hiddenVideos: { deleted: false, visible: false },
  scheduledVideos: { deleted: false, status: ["UPCOMING"], visible: true },
  totalVideos: { deleted: false },
  visibleVideos: {
    deleted: false,
    status: PUBLIC_VIDEO_STATUSES,
    visible: true,
  },
} as const satisfies Record<VideoSummaryTile, VideoSummaryFilter>;

/**
 * Build the URL of the video list filtered by the condition. `status` repeats
 * the parameter for each value, which the video list reads as multiple values.
 */
export const getVideoListHref = (filter: VideoSummaryFilter): string => {
  const searchParams = new URLSearchParams();

  searchParams.append("deleted", String(filter.deleted));

  if (filter.visible !== undefined) {
    searchParams.append("visible", String(filter.visible));
  }

  for (const status of filter.status ?? []) {
    searchParams.append("status", status);
  }

  return `/videos?${searchParams.toString()}`;
};
