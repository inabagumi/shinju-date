import {
  type FilteredYouTubeChannel,
  type FilteredYouTubePlaylistItem,
  type FilteredYouTubeVideo,
  type GetChannelsOptions,
  type GetPlaylistItemsOptions,
  type GetVideosOptions,
  getChannels as getChannelsFromClient,
  getPlaylistItems as getPlaylistItemsFromClient,
  getVideos as getVideosFromClient,
  YOUTUBE_DATA_API_MAX_RESULTS,
  youtubeClient,
} from '@shinju-date/youtube-api-client'

export { YOUTUBE_DATA_API_MAX_RESULTS, youtubeClient }

export type {
  FilteredYouTubeChannel,
  FilteredYouTubePlaylistItem,
  FilteredYouTubeVideo,
  GetChannelsOptions,
  GetPlaylistItemsOptions,
  GetVideosOptions,
}

/**
 * Gets YouTube channels by their IDs
 * @param options - The options for getting channels
 * @yields YouTube channel objects
 */
export async function* getChannels(
  options: GetChannelsOptions,
): AsyncGenerator<FilteredYouTubeChannel, void, undefined> {
  yield* getChannelsFromClient(options)
}

/**
 * Gets YouTube playlist items by playlist ID
 * @param options - The options for getting playlist items
 * @yields YouTube playlist item objects
 * @deprecated Use YouTubeScraper.getPlaylistItems from @shinju-date/youtube-scraper instead
 */
export async function* getPlaylistItems(
  options: GetPlaylistItemsOptions,
): AsyncGenerator<FilteredYouTubePlaylistItem, void, undefined> {
  yield* getPlaylistItemsFromClient(options)
}

/**
 * Gets YouTube videos by their IDs
 * @param options - The options for getting videos
 * @yields YouTube video objects
 * @deprecated Use YouTubeScraper.getVideos from @shinju-date/youtube-scraper instead
 */
export async function* getVideos(
  options: GetVideosOptions,
): AsyncGenerator<FilteredYouTubeVideo, void, undefined> {
  yield* getVideosFromClient(options)
}
