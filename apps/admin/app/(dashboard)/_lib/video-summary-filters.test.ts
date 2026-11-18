import { describe, expect, it } from "vitest";

import { videoSearchParamsSchema } from "../videos/_lib/search-params-schema";
import {
  getVideoListHref,
  VIDEO_SUMMARY_FILTERS,
} from "./video-summary-filters";
import type { VideoSummaryTile } from "./video-summary-filters";

/** Read the query of the URL as Next.js passes `searchParams` to the page */
const parseSearchParams = (href: string) => {
  const searchParams = new URL(href, "http://localhost").searchParams;
  const result: Record<string, string | string[]> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    result[key] = values.length > 1 ? values : (values[0] ?? "");
  }

  return result;
};

const tiles = Object.keys(VIDEO_SUMMARY_FILTERS) as VideoSummaryTile[];

describe(getVideoListHref, () => {
  it("repeats the status parameter for each status", () => {
    expect(getVideoListHref(VIDEO_SUMMARY_FILTERS.visibleVideos)).toBe(
      "/videos?deleted=false&visible=true&status=ENDED&status=LIVE&status=PUBLISHED"
    );
  });

  it.each(tiles)(
    "makes the video list filter the videos that %s counts",
    (tile) => {
      const filter = VIDEO_SUMMARY_FILTERS[tile];
      const params = videoSearchParamsSchema.parse(
        parseSearchParams(getVideoListHref(filter))
      );

      expect(params.deleted).toStrictEqual([filter.deleted]);
      expect(params.visible).toStrictEqual(
        "visible" in filter ? [filter.visible] : undefined
      );
      expect(params.status).toStrictEqual(
        "status" in filter ? [...filter.status] : undefined
      );
    }
  );
});
