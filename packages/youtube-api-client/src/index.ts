import { youtube_v3 as youtube } from '@googleapis/youtube'
import { z } from 'zod'

export const YOUTUBE_DATA_API_MAX_RESULTS = 50

// Zod schemas for YouTube API responses
export const YouTubeChannelSchema = z.object({
  contentDetails: z.object({
    relatedPlaylists: z.object({
      uploads: z.string(),
    }),
  }),
  id: z.string(),
})

export const YouTubePlaylistItemSchema = z.object({
  contentDetails: z.object({
    videoId: z.string(),
  }),
})

export const YouTubeVideoSnippetSchema = z.object({
  publishedAt: z.string(),
})

export const YouTubeVideoSchema = z.object({
  contentDetails: z.object({}),
  id: z.string(),
  snippet: YouTubeVideoSnippetSchema,
})

// Infer TypeScript types from Zod schemas
export type YouTubeChannel = z.infer<typeof YouTubeChannelSchema>
export type YouTubePlaylistItem = z.infer<typeof YouTubePlaylistItemSchema>
export type YouTubeVideo = z.infer<typeof YouTubeVideoSchema>

// Client creation function
export function createYouTubeClient() {
  const apiKey = process.env['GOOGLE_API_KEY']

  if (!apiKey) {
    throw new TypeError('An API Key is required.')
  }

  return new youtube.Youtube({
    auth: apiKey,
    fetchImplementation: fetch,
  })
}

let _youtubeClient: youtube.Youtube | null = null

/**
 * Gets or creates a singleton YouTube client instance
 */
export function getYouTubeClient(): youtube.Youtube {
  if (!_youtubeClient) {
    _youtubeClient = createYouTubeClient()
  }
  return _youtubeClient
}

/**
 * Backwards compatibility export for direct client access
 * This provides access to the full YouTube client instance
 */
export const youtubeClient: youtube.Youtube = new Proxy({} as youtube.Youtube, {
  get(_target, prop) {
    return getYouTubeClient()[prop as keyof youtube.Youtube]
  },
})

// Options types
export type GetChannelsOptions = {
  ids: string[]
}

export type GetPlaylistItemsOptions = {
  all?: boolean
  playlistID: string
}

export type GetVideosOptions = {
  ids: string[]
}

/**
 * Filtered YouTube channel type with required fields
 */
export type FilteredYouTubeChannel = youtube.Schema$Channel & {
  contentDetails: NonNullable<youtube.Schema$ChannelContentDetails> & {
    relatedPlaylists: NonNullable<
      NonNullable<youtube.Schema$ChannelContentDetails>['relatedPlaylists']
    > & {
      uploads: string
    }
  }
  id: string
}

/**
 * Filtered YouTube playlist item type with required fields
 */
export type FilteredYouTubePlaylistItem = youtube.Schema$PlaylistItem & {
  contentDetails: NonNullable<youtube.Schema$PlaylistItemContentDetails> & {
    videoId: string
  }
}

/**
 * Filtered YouTube video type with required fields
 */
export type FilteredYouTubeVideo = youtube.Schema$Video & {
  contentDetails: NonNullable<youtube.Schema$Video['contentDetails']>
  id: string
  snippet: NonNullable<youtube.Schema$Video['snippet']> & {
    publishedAt: string
  }
}

/**
 * Validates a channel response using Zod schema
 */
function validateChannel(
  channel: youtube.Schema$Channel,
): channel is FilteredYouTubeChannel {
  try {
    YouTubeChannelSchema.parse({
      contentDetails: {
        relatedPlaylists: {
          uploads: channel.contentDetails?.relatedPlaylists?.uploads,
        },
      },
      id: channel.id,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Validates a playlist item response using Zod schema
 */
function validatePlaylistItem(
  item: youtube.Schema$PlaylistItem,
): item is FilteredYouTubePlaylistItem {
  try {
    YouTubePlaylistItemSchema.parse({
      contentDetails: {
        videoId: item.contentDetails?.videoId,
      },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Validates a video response using Zod schema
 */
function validateVideo(
  video: youtube.Schema$Video,
): video is FilteredYouTubeVideo {
  try {
    YouTubeVideoSchema.parse({
      contentDetails: video.contentDetails || {},
      id: video.id,
      snippet: {
        publishedAt: video.snippet?.publishedAt,
      },
    })
    return true
  } catch {
    return false
  }
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
  const client = getYouTubeClient()
  for (let i = 0; i < ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
    const {
      data: { items },
    } = await client.channels.list({
      id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ['contentDetails', 'id'],
    })

    if (!items || items.length < 1) {
      continue
    }

    yield* items.filter(validateChannel)
  }
}

/**
 * Gets YouTube playlist items by playlist ID
 * @param options - The options for getting playlist items
 * @yields YouTube playlist item objects
 */
export async function* getPlaylistItems({
  all = false,
  playlistID,
}: GetPlaylistItemsOptions): AsyncGenerator<
  FilteredYouTubePlaylistItem,
  void,
  undefined
> {
  const client = getYouTubeClient()
  let pageToken: string | undefined

  while (true) {
    const {
      data: { items, nextPageToken },
    } = await client.playlistItems.list({
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

    yield* items.filter(validatePlaylistItem)

    if (!all || !nextPageToken) {
      break
    }

    pageToken = nextPageToken
  }
}

/**
 * Gets YouTube videos by their IDs
 * @param options - The options for getting videos
 * @yields YouTube video objects
 */
export async function* getVideos({
  ids,
}: GetVideosOptions): AsyncGenerator<FilteredYouTubeVideo, void, undefined> {
  const client = getYouTubeClient()
  for (let i = 0; i < ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
    const {
      data: { items },
    } = await client.videos.list({
      id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ['contentDetails', 'liveStreamingDetails', 'snippet'],
    })

    if (!items || items.length < 1) {
      continue
    }

    yield* items.filter(validateVideo)
  }
}
