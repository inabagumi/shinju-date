import type { youtube_v3 as youtube } from "@googleapis/youtube";
import { paginate } from "@shinju-date/helpers";

import { YOUTUBE_DATA_API_MAX_RESULTS } from "./batches.js";
import { getYouTubeClient } from "./client.js";
import type { ClientOptions } from "./client.js";
import type {
  FilteredYouTubePlaylistItem,
  YouTubePlaylistItemsPage,
} from "./types.js";

interface GetPlaylistItemsOptions extends ClientOptions {
  /** Drain every page when true (default: first page only). */
  all?: boolean;
  /** Page size. Defaults to the API maximum when `all` is set, 20 otherwise. */
  maxResults?: number;
  playlistID: string;
}

/**
 * Returns true when the playlist item has the video ID that
 * {@link FilteredYouTubePlaylistItem} requires.
 */
export const isFilteredYouTubePlaylistItem = (
  item: youtube.Schema$PlaylistItem
): item is FilteredYouTubePlaylistItem =>
  typeof item.contentDetails?.videoId === "string";

/**
 * Gets YouTube playlist items by playlist ID
 * @param options - The options for getting playlist items
 * @yields {FilteredYouTubePlaylistItem} YouTube playlist item objects
 */
export const getPlaylistItems = async function* getPlaylistItems({
  all = false,
  client = getYouTubeClient(),
  maxResults = all ? YOUTUBE_DATA_API_MAX_RESULTS : 20,
  playlistID,
}: GetPlaylistItemsOptions): AsyncGenerator<
  FilteredYouTubePlaylistItem,
  void,
  undefined
> {
  if (!all) {
    const { items } = await getPlaylistItemsPage({
      client,
      maxResults,
      playlistID,
    });

    yield* items;

    return;
  }

  yield* paginate(async (pageToken) => {
    const { items, nextPageToken } = await getPlaylistItemsPage({
      client,
      maxResults,
      pageToken,
      playlistID,
    });

    return { items, next: nextPageToken };
  });
};

interface GetPlaylistItemsPageOptions extends ClientOptions {
  /** Page size (default: the API maximum). */
  maxResults?: number;
  /** Token returned by the previous page; omit for the first page. */
  pageToken?: string | undefined;
  playlistID: string;
}

/**
 * Gets one page of a playlist.
 *
 * Unlike {@link getPlaylistItems} with `all`, the caller keeps the page token,
 * so a long playlist can be walked across several runs.
 */
export const getPlaylistItemsPage = async ({
  client = getYouTubeClient(),
  maxResults = YOUTUBE_DATA_API_MAX_RESULTS,
  pageToken,
  playlistID,
}: GetPlaylistItemsPageOptions): Promise<YouTubePlaylistItemsPage> => {
  const {
    data: { items, nextPageToken },
  } = await client.playlistItems.list({
    maxResults,
    part: ["contentDetails"],
    playlistId: playlistID,
    ...(pageToken ? { pageToken } : {}),
  });

  return {
    items: (items ?? []).filter(isFilteredYouTubePlaylistItem),
    // An empty page ends the walk even if YouTube returns a token with it.
    nextPageToken:
      items && items.length > 0 && nextPageToken ? nextPageToken : null,
  };
};
