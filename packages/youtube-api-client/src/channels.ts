import type { youtube_v3 as youtube } from "@googleapis/youtube";

import { requestInBatches, YOUTUBE_DATA_API_MAX_RESULTS } from "./batches.js";
import type { BatchOptions } from "./batches.js";
import { getYouTubeClient } from "./client.js";
import type { ClientOptions } from "./client.js";
import type { YouTubeChannelIdentifier } from "./identifiers.js";
import type { FilteredYouTubeChannel } from "./types.js";

interface GetChannelsOptions extends ClientOptions, BatchOptions {
  ids: string[];
}

interface GetChannelByHandleOptions extends ClientOptions {
  handle: string;
}

/**
 * Returns true when the channel has the ID, the uploads playlist and the
 * title that {@link FilteredYouTubeChannel} requires.
 */
export const isFilteredYouTubeChannel = (
  channel: youtube.Schema$Channel
): channel is FilteredYouTubeChannel =>
  typeof channel.id === "string" &&
  typeof channel.contentDetails?.relatedPlaylists?.uploads === "string" &&
  typeof channel.snippet?.title === "string";

/**
 * Gets YouTube channels by their IDs
 * @param options - The options for getting channels
 * @yields {FilteredYouTubeChannel} YouTube channel objects
 */
export const getChannels = async function* getChannels({
  client = getYouTubeClient(),
  ids,
  schedule,
}: GetChannelsOptions): AsyncGenerator<
  FilteredYouTubeChannel,
  void,
  undefined
> {
  yield* requestInBatches(ids, schedule, async (batch) => {
    const {
      data: { items },
    } = await client.channels.list({
      id: batch,
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ["contentDetails", "id", "snippet"],
    });

    return (items ?? []).filter(isFilteredYouTubeChannel);
  });
};

/**
 * Gets a single YouTube channel by channel ID.
 * @returns The channel, or `null` if not found / invalid
 */
const getChannelById = async (
  id: string
): Promise<FilteredYouTubeChannel | null> => {
  const [channel] = await Array.fromAsync(getChannels({ ids: [id] }));

  return channel ?? null;
};

/**
 * Gets a single YouTube channel by handle (with or without leading `@`).
 * Uses the YouTube Data API `forHandle` parameter.
 * @returns The channel, or `null` if not found / invalid
 */
const getChannelByHandle = async ({
  client = getYouTubeClient(),
  handle,
}: GetChannelByHandleOptions): Promise<FilteredYouTubeChannel | null> => {
  const normalized = handle.startsWith("@") ? handle : `@${handle}`;

  const {
    data: { items },
  } = await client.channels.list({
    forHandle: normalized,
    maxResults: 1,
    part: ["contentDetails", "id", "snippet"],
  });

  if (!items || items.length < 1) {
    return null;
  }

  const channel = items.find(isFilteredYouTubeChannel);
  return channel ?? null;
};

/**
 * Resolves a parsed identifier to a YouTube channel via the Data API.
 */
export const resolveYouTubeChannel = async (
  identifier: YouTubeChannelIdentifier
): Promise<FilteredYouTubeChannel | null> => {
  if (identifier.kind === "id") {
    return await getChannelById(identifier.id);
  }
  return await getChannelByHandle({ handle: identifier.handle });
};
