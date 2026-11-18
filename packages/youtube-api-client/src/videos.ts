import type { youtube_v3 as youtube } from "@googleapis/youtube";

import { requestInBatches, YOUTUBE_DATA_API_MAX_RESULTS } from "./batches.js";
import type { BatchOptions } from "./batches.js";
import { getYouTubeClient } from "./client.js";
import type { ClientOptions } from "./client.js";
import type { FilteredYouTubeVideo } from "./types.js";

interface GetVideosOptions extends ClientOptions, BatchOptions {
  ids: string[];
}

interface GetVideoIdsOptions extends ClientOptions, BatchOptions {
  ids: string[];
}

/**
 * Returns true when the video has the ID and the publication time that
 * {@link FilteredYouTubeVideo} requires.
 *
 * `contentDetails` is not checked: the requests ask for that part, so YouTube
 * returns it with every video.
 */
export const isFilteredYouTubeVideo = (
  video: youtube.Schema$Video
): video is FilteredYouTubeVideo =>
  typeof video.id === "string" &&
  typeof video.snippet?.publishedAt === "string";

/**
 * Gets YouTube videos by their IDs
 * @param options - The options for getting videos
 * @yields YouTube video objects
 */
export const getVideos = async function* getVideos({
  client = getYouTubeClient(),
  ids,
  schedule,
}: GetVideosOptions): AsyncGenerator<FilteredYouTubeVideo, void, undefined> {
  yield* requestInBatches(ids, schedule, async (batch) => {
    const {
      data: { items },
    } = await client.videos.list({
      id: batch,
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ["contentDetails", "liveStreamingDetails", "snippet"],
    });

    return (items ?? []).filter(isFilteredYouTubeVideo);
  });
};

/**
 * Gets the IDs of the videos that still exist on YouTube.
 * Requests only the `id` part, so it is the cheapest way to detect videos
 * that were deleted or made private (those are omitted from the response).
 * @param options - The options for getting video IDs
 * @yields IDs of the videos YouTube returned
 */
export const getVideoIds = async function* getVideoIds({
  client = getYouTubeClient(),
  ids,
  schedule,
}: GetVideoIdsOptions): AsyncGenerator<string, void, undefined> {
  yield* requestInBatches(ids, schedule, async (batch) => {
    const {
      data: { items },
    } = await client.videos.list({
      id: batch,
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ["id"],
    });

    return (items ?? []).flatMap((item) =>
      typeof item.id === "string" ? [item.id] : []
    );
  });
};
