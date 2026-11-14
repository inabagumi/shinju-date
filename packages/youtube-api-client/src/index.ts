import { youtube_v3 as youtube } from '@googleapis/youtube'
import { z } from 'zod'

export { getPublishedAt } from './get-published-at.js'
export { getVideoKind, type YouTubeVideoKind } from './get-video-kind.js'
export {
  getVideoStatus,
  type YouTubeVideoStatus,
} from './get-video-status.js'

export const YOUTUBE_DATA_API_MAX_RESULTS = 50

// Zod schemas for YouTube API responses
export const YouTubeChannelSnippetSchema = z.object({
  customUrl: z.string().optional(),
  title: z.string(),
})

export const YouTubeChannelSchema = z.object({
  contentDetails: z.object({
    relatedPlaylists: z.object({
      uploads: z.string(),
    }),
  }),
  id: z.string(),
  snippet: YouTubeChannelSnippetSchema,
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
interface ClientOptions {
  /** YouTube client to use. Defaults to the shared singleton. */
  client?: youtube.Youtube | undefined
}

export interface GetChannelsOptions extends ClientOptions {
  ids: string[]
}

export interface GetChannelByHandleOptions extends ClientOptions {
  handle: string
}

export interface GetPlaylistItemsOptions extends ClientOptions {
  /** Drain every page when true (default: first page only). */
  all?: boolean
  /** Page size. Defaults to the API maximum when `all` is set, 20 otherwise. */
  maxResults?: number
  playlistID: string
}

export interface GetVideosOptions extends ClientOptions {
  ids: string[]
}

export interface GetVideoIdsOptions extends ClientOptions {
  ids: string[]
}

/**
 * Returns true when a YouTube Data API call failed with the given HTTP status.
 */
export function isYouTubeApiError(error: unknown, status: number): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const candidate = error as {
    code?: unknown
    response?: { status?: unknown }
    status?: unknown
  }

  return (
    candidate.status === status ||
    candidate.response?.status === status ||
    Number(candidate.code) === status
  )
}

/**
 * Parsed YouTube channel identifier from user input (ID, handle, or URL).
 */
export type YouTubeChannelIdentifier =
  | { kind: 'id'; id: string }
  | { kind: 'handle'; handle: string }

/** YouTube channel ID: UC + 22 characters (24 total). */
const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[\w-]{22}$/

/** YouTube handle body (without @): 3–30 chars of letters, digits, underscore, hyphen, period. */
const YOUTUBE_HANDLE_PATTERN = /^[\w.-]{3,30}$/

/**
 * Parses free-form user input into a YouTube channel ID or handle.
 *
 * Supported forms:
 * - Channel ID: `UCxxxxxxxxxxxxxxxxxxxxxx`
 * - Handle: `@name` or `name`
 * - Channel URL: `https://www.youtube.com/channel/UCxxx...`
 * - Handle URL: `https://www.youtube.com/@name`
 * - Legacy custom URL: `https://www.youtube.com/c/Name` (looked up as handle)
 * - Legacy user URL: `https://www.youtube.com/user/Name` (looked up as handle)
 *
 * @returns Parsed identifier, or `null` if the input cannot be interpreted
 */
export function parseYouTubeChannelIdentifier(
  raw: string,
): YouTubeChannelIdentifier | null {
  const input = raw.trim()
  if (!input) {
    return null
  }

  const asUrl =
    input.startsWith('http://') || input.startsWith('https://')
      ? input
      : /^(?:www\.)?(?:m\.)?youtube\.com\//i.test(input)
        ? `https://${input}`
        : null

  if (asUrl) {
    try {
      const url = new URL(asUrl)
      const host = url.hostname.replace(/^www\./, '').toLowerCase()

      if (
        host === 'youtube.com' ||
        host === 'm.youtube.com' ||
        host === 'music.youtube.com'
      ) {
        const channelMatch = url.pathname.match(
          /^\/channel\/(UC[\w-]{22})(?:\/|$)/i,
        )
        if (channelMatch?.[1]) {
          return { id: channelMatch[1], kind: 'id' }
        }

        const handleMatch = url.pathname.match(/^\/@([\w.-]+)(?:\/|$)/)
        if (handleMatch?.[1]) {
          return { handle: handleMatch[1], kind: 'handle' }
        }

        const customMatch = url.pathname.match(/^\/c\/([^/?#]+)(?:\/|$)/)
        if (customMatch?.[1]) {
          return {
            handle: decodeURIComponent(customMatch[1]),
            kind: 'handle',
          }
        }

        const userMatch = url.pathname.match(/^\/user\/([^/?#]+)(?:\/|$)/)
        if (userMatch?.[1]) {
          return {
            handle: decodeURIComponent(userMatch[1]),
            kind: 'handle',
          }
        }
      }
    } catch {
      // Not a valid URL; fall through to bare ID / handle parsing.
    }
  }

  if (YOUTUBE_CHANNEL_ID_PATTERN.test(input)) {
    return { id: input, kind: 'id' }
  }

  const handle = input.startsWith('@') ? input.slice(1) : input
  if (YOUTUBE_HANDLE_PATTERN.test(handle)) {
    return { handle, kind: 'handle' }
  }

  return null
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
  snippet: NonNullable<youtube.Schema$Channel['snippet']> & {
    title: string
  }
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
      snippet: {
        ...(channel.snippet?.customUrl
          ? { customUrl: channel.snippet.customUrl }
          : {}),
        title: channel.snippet?.title,
      },
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
  client = getYouTubeClient(),
  ids,
}: GetChannelsOptions): AsyncGenerator<
  FilteredYouTubeChannel,
  void,
  undefined
> {
  for (let i = 0; i < ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
    const {
      data: { items },
    } = await client.channels.list({
      id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ['contentDetails', 'id', 'snippet'],
    })

    if (!items || items.length < 1) {
      continue
    }

    yield* items.filter(validateChannel)
  }
}

/**
 * Gets a single YouTube channel by channel ID.
 * @returns The channel, or `null` if not found / invalid
 */
export async function getChannelById(
  id: string,
): Promise<FilteredYouTubeChannel | null> {
  for await (const channel of getChannels({ ids: [id] })) {
    return channel
  }
  return null
}

/**
 * Gets a single YouTube channel by handle (with or without leading `@`).
 * Uses the YouTube Data API `forHandle` parameter.
 * @returns The channel, or `null` if not found / invalid
 */
export async function getChannelByHandle({
  client = getYouTubeClient(),
  handle,
}: GetChannelByHandleOptions): Promise<FilteredYouTubeChannel | null> {
  const normalized = handle.startsWith('@') ? handle : `@${handle}`

  const {
    data: { items },
  } = await client.channels.list({
    forHandle: normalized,
    maxResults: 1,
    part: ['contentDetails', 'id', 'snippet'],
  })

  if (!items || items.length < 1) {
    return null
  }

  const channel = items.find(validateChannel)
  return channel ?? null
}

/**
 * Resolves a parsed identifier to a YouTube channel via the Data API.
 */
export async function resolveYouTubeChannel(
  identifier: YouTubeChannelIdentifier,
): Promise<FilteredYouTubeChannel | null> {
  if (identifier.kind === 'id') {
    return getChannelById(identifier.id)
  }
  return getChannelByHandle({ handle: identifier.handle })
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
  client = getYouTubeClient(),
  ids,
}: GetVideosOptions): AsyncGenerator<FilteredYouTubeVideo, void, undefined> {
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

/**
 * Gets the IDs of the videos that still exist on YouTube.
 * Requests only the `id` part, so it is the cheapest way to detect videos
 * that were deleted or made private (those are omitted from the response).
 * @param options - The options for getting video IDs
 * @yields IDs of the videos YouTube returned
 */
export async function* getVideoIds({
  client = getYouTubeClient(),
  ids,
}: GetVideoIdsOptions): AsyncGenerator<string, void, undefined> {
  for (let i = 0; i < ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
    const {
      data: { items },
    } = await client.videos.list({
      id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ['id'],
    })

    for (const item of items ?? []) {
      if (typeof item.id === 'string') {
        yield item.id
      }
    }
  }
}
