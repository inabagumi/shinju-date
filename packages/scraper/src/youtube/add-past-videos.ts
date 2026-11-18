import { YOUTUBE_CHANNELS } from "../internal/database/index.js";
import { addPastVideosWith } from "../internal/operations/add-past-videos.js";
import type { PastVideoAdapter } from "../internal/operations/add-past-videos.js";
import type {
  AddPastVideosOptions,
  AddPastVideosResult,
  CrawlContext,
} from "../types.js";
import { saveNewYouTubeVideos } from "./add-new-videos.js";
import type { YouTubeFetcher } from "./fetcher.js";

/**
 * Describes YouTube to the backfill: the uploads playlist lists video IDs
 * only, and details are requested just for the IDs that are not saved yet.
 */
const YOUTUBE_PAST_VIDEOS: PastVideoAdapter<YouTubeFetcher, string> = {
  accountTable: YOUTUBE_CHANNELS,
  async getPage({ fetcher }, channel, cursor) {
    const page = await fetcher.getUploadPage(channel.platformId, { cursor });

    return page && { cursor: page.cursor, listed: page.videoIds };
  },
  saveNew: (context, channel, videoIds, concurrency) =>
    saveNewYouTubeVideos(
      context,
      new Map(videoIds.map((videoId) => [videoId, channel])),
      concurrency
    ),
};

/**
 * Reads one page of a YouTube channel's uploads, newest first, and saves the
 * videos that are not saved yet. Videos that are saved already are left
 * alone. Call it again with the returned cursor until it is `null`.
 *
 * @throws {AccountNotFoundError} When the channel does not exist (in the
 *   database or on YouTube) or its talent was deleted.
 * @throws {StalledPaginationError} When YouTube returns the requested cursor
 *   as the next one.
 */
export const addPastYouTubeVideos = (
  context: CrawlContext<YouTubeFetcher>,
  options: Pick<AddPastVideosOptions, "accountId" | "cursor">
): Promise<AddPastVideosResult> =>
  addPastVideosWith(context, YOUTUBE_PAST_VIDEOS, options);
