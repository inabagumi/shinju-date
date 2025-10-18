import { youtube_v3 as youtube } from '@googleapis/youtube'

export const YOUTUBE_DATA_API_MAX_RESULTS = 50

function createYouTubeClient() {
  const apiKey = process.env['GOOGLE_API_KEY']

  if (!apiKey) {
    throw new TypeError('An API Key is required.')
  }

  return new youtube.Youtube({
    auth: apiKey,
    fetchImplementation: fetch,
  })
}

export const youtubeClient = createYouTubeClient()

type NonNullableChannelContentDetails =
  NonNullable<youtube.Schema$ChannelContentDetails>

type NonNullableChannelRelatedPlaylists = NonNullable<
  NonNullableChannelContentDetails['relatedPlaylists']
>

/**
 * Filtered YouTube channel type with required fields
 * @deprecated Use YouTubeChannel from @shinju-date/youtube-scraper instead
 */
export type FilteredYouTubeChannel = youtube.Schema$Channel & {
  contentDetails: NonNullableChannelContentDetails & {
    relatedPlaylists: NonNullableChannelRelatedPlaylists & {
      uploads: NonNullable<NonNullableChannelRelatedPlaylists['uploads']>
    }
  }
  id: NonNullable<youtube.Schema$Channel['id']>
}

export type GetChannelsOptions = {
  ids: string[]
}

/**
 * Gets YouTube channels by their IDs
 * @param options - The options for getting channels
 * @yields YouTube channel objects
 */
export async function* getChannels({
  ids,
}: GetChannelsOptions): AsyncGenerator<
  FilteredYouTubeChannel,
  void,
  undefined
> {
  for (let i = 0; i < ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
    const {
      data: { items },
    } = await youtubeClient.channels.list({
      id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ['contentDetails', 'id'],
    })

    if (!items || items.length < 1) {
      continue
    }

    yield* items.filter(
      (item): item is FilteredYouTubeChannel =>
        typeof item.id === 'string' &&
        typeof item.contentDetails?.relatedPlaylists?.uploads === 'string',
    )
  }
}

/**
 * Filtered YouTube playlist item type with required fields
 * @deprecated Use YouTubePlaylistItem from @shinju-date/youtube-scraper instead
 */
export type FilteredYouTubePlaylistItem = youtube.Schema$PlaylistItem & {
  contentDetails: NonNullable<youtube.Schema$PlaylistItemContentDetails> & {
    videoId: NonNullable<youtube.Schema$PlaylistItemContentDetails['videoId']>
  }
}

export type GetPlaylistItemsOptions = {
  all?: boolean
  playlistID: string
}

/**
 * Gets YouTube playlist items by playlist ID
 * @param options - The options for getting playlist items
 * @yields YouTube playlist item objects
 * @deprecated Use YouTubeScraper.getPlaylistItems from @shinju-date/youtube-scraper instead
 */
export async function* getPlaylistItems({
  all = false,
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
    } = await youtubeClient.playlistItems.list({
      maxResults: all ? YOUTUBE_DATA_API_MAX_RESULTS : 20,
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

    yield* items.filter(
      (item): item is FilteredYouTubePlaylistItem =>
        typeof item.contentDetails?.videoId === 'string',
    )

    if (!all || !nextPageToken) {
      break
    }

    pageToken = nextPageToken
  }
}

/**
 * Filtered YouTube video type with required fields
 * @deprecated Use YouTubeVideo from @shinju-date/youtube-scraper instead
 */
export type FilteredYouTubeVideo = youtube.Schema$Video & {
  contentDetails: NonNullable<youtube.Schema$Video['contentDetails']>
  id: NonNullable<youtube.Schema$Video['id']>
  snippet: NonNullable<youtube.Schema$Video['snippet']> & {
    publishedAt: NonNullable<youtube.Schema$VideoSnippet['publishedAt']>
  }
}

export type GetVideosOptions = {
  ids: string[]
}

/**
 * Gets YouTube videos by their IDs
 * @param options - The options for getting videos
 * @yields YouTube video objects
 * @deprecated Use YouTubeScraper.getVideos from @shinju-date/youtube-scraper instead
 */
export async function* getVideos({
  ids,
}: GetVideosOptions): AsyncGenerator<FilteredYouTubeVideo, void, undefined> {
  for (let i = 0; i < ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
    const {
      data: { items },
    } = await youtubeClient.videos.list({
      id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ['contentDetails', 'liveStreamingDetails', 'snippet'],
    })

    if (!items || items.length < 1) {
      continue
    }

    yield* items.filter(
      (item): item is FilteredYouTubeVideo =>
        typeof item.id === 'string' &&
        typeof item.snippet?.publishedAt === 'string' &&
        'contentDetails' in item,
    )
  }
}
