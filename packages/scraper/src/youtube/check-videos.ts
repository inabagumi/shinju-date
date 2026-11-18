import { refreshSavedVideos } from "../internal/operations/refresh-saved-videos.js";
import type { RefreshScope } from "../internal/operations/refresh-saved-videos.js";
import { sweepUnavailableVideos } from "../internal/operations/sweep-unavailable-videos.js";
import type { CrawlContext } from "../types.js";
import type { YouTubeFetcher } from "./fetcher.js";
import { createYouTubePlatform } from "./platform.js";
import { refreshYouTubeThumbnail } from "./thumbnail.js";

/**
 * Brings saved videos in line with YouTube: updates what changed (status,
 * schedule, title, duration), fills in missing thumbnails, follows thumbnails
 * replaced before or during a stream (see `refreshYouTubeThumbnail`) and
 * soft-deletes videos YouTube no longer returns.
 *
 * @returns The number of videos updated or deleted.
 */
export const refreshYouTubeVideos = (
  context: CrawlContext<YouTubeFetcher>,
  scope: RefreshScope
): Promise<number> => {
  const platform = createYouTubePlatform(context.fetcher);

  return refreshSavedVideos(context, platform, {
    afterRefresh: (saved, fetched) =>
      refreshYouTubeThumbnail(context, saved, fetched),
    scope,
  });
};

/**
 * Checks every saved video of non-deleted talents (retired ones included) and
 * soft-deletes those YouTube no longer returns. Details are not refreshed.
 *
 * @returns The number of videos deleted.
 */
export const removeUnavailableYouTubeVideos = (
  context: CrawlContext<YouTubeFetcher>
): Promise<number> =>
  sweepUnavailableVideos(context, createYouTubePlatform(context.fetcher));
