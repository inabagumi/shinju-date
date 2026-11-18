import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { YOUTUBE_DATA_API_MAX_RESULTS } from './batches.js'
import { type ClientOptions, getYouTubeClient } from './client.js'
import type {
  FilteredYouTubePlaylistItem,
  YouTubePlaylistItemsPage,
} from './types.js'

interface GetPlaylistItemsOptions extends ClientOptions {
  /** Drain every page when true (default: first page only). */
  all?: boolean
  /** Page size. Defaults to the API maximum when `all` is set, 20 otherwise. */
  maxResults?: number
  playlistID: string
}

/**
 * Returns true when the playlist item has the video ID that
 * {@link FilteredYouTubePlaylistItem} requires.
 */
export function isFilteredYouTubePlaylistItem(
  item: youtube.Schema$PlaylistItem,
): item is FilteredYouTubePlaylistItem {
  return typeof item.contentDetails?.videoId === 'string'
}

/**
 * Gets YouTube playlist items by playlist ID
 * @param options - The options for getting playlist items
 * @yields YouTube playlist item objects
 */
export async function* getPlaylistItems({
  all = false,
  client = getYouTubeClient(),
  maxResults = all ? YOUTUBE_DATA_API_MAX_RESULTS : 20,
  playlistID,
}: GetPlaylistItemsOptions): AsyncGenerator<
  FilteredYouTubePlaylistItem,
  void,
  undefined
> {
  let pageToken: string | undefined

  while (true) {
    const {
      data: { items, nextPageToken },
    } = await client.playlistItems.list({
      maxResults,
      part: ['contentDetails'],
      playlistId: playlistID,
      ...(pageToken
        ? {
            pageToken,
          }
        : {}),
    })

    if (!items || items.length < 1) {
      break
    }

    yield* items.filter(isFilteredYouTubePlaylistItem)

    if (!all || !nextPageToken) {
      break
    }

    pageToken = nextPageToken
  }
}

interface GetPlaylistItemsPageOptions extends ClientOptions {
  /** Page size (default: the API maximum). */
  maxResults?: number
  /** Token returned by the previous page; omit for the first page. */
  pageToken?: string | undefined
  playlistID: string
}

/**
 * Gets one page of a playlist.
 *
 * Unlike {@link getPlaylistItems} with `all`, the caller keeps the page token,
 * so a long playlist can be walked across several runs.
 */
export async function getPlaylistItemsPage({
  client = getYouTubeClient(),
  maxResults = YOUTUBE_DATA_API_MAX_RESULTS,
  pageToken,
  playlistID,
}: GetPlaylistItemsPageOptions): Promise<YouTubePlaylistItemsPage> {
  const {
    data: { items, nextPageToken },
  } = await client.playlistItems.list({
    maxResults,
    part: ['contentDetails'],
    playlistId: playlistID,
    ...(pageToken ? { pageToken } : {}),
  })

  return {
    items: (items ?? []).filter(isFilteredYouTubePlaylistItem),
    nextPageToken: nextPageToken || null,
  }
}
