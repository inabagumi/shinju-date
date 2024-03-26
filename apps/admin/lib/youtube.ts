import { youtube_v3 as youtube } from '@googleapis/youtube'

export const YOUTUBE_DATA_API_MAX_RESULTS = 50

function createYouTubeClient() {
  const apiKey = process.env['GOOGLE_API_KEY']

  if (!apiKey) {
    throw new TypeError('An API Key is required.')
  }

  return new youtube.Youtube({
    auth: apiKey,
    fetchImplementation: fetch
  })
}

export const youtubeClient = createYouTubeClient()

type NonNullableChannelContentDetails =
  NonNullable<youtube.Schema$ChannelContentDetails>

type NonNullableChannelRelatedPlaylists = NonNullable<
  NonNullableChannelContentDetails['relatedPlaylists']
>

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

export async function* getChannels({
  ids
}: GetChannelsOptions): AsyncGenerator<
  FilteredYouTubeChannel,
  void,
  undefined
> {
  for (let i = 0; i < ids.length; i += 50) {
    const {
      data: { items }
    } = await youtubeClient.channels.list({
      id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS),
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ['contentDetails', 'id']
    })

    if (!items || items.length < 1) {
      continue
    }

    yield* items.filter(
      (item): item is FilteredYouTubeChannel =>
        typeof item.id === 'string' &&
        typeof item.contentDetails?.relatedPlaylists?.uploads === 'string'
    )
  }
}

export type FilteredYouTubePlaylistItem = youtube.Schema$PlaylistItem & {
  contentDetails: NonNullable<youtube.Schema$PlaylistItemContentDetails> & {
    videoId: NonNullable<youtube.Schema$PlaylistItemContentDetails['videoId']>
  }
}

export type GetPlaylistItemsOptions = {
  all?: boolean
  playlistID: string
}

export async function* getPlaylistItems({
  all = false,
  playlistID
}: GetPlaylistItemsOptions): AsyncGenerator<
  FilteredYouTubePlaylistItem,
  void,
  undefined
> {
  let pageToken: string | undefined

  while (true) {
    const {
      data: { items, nextPageToken }
    } = await youtubeClient.playlistItems.list({
      maxResults: 50,
      part: ['contentDetails'],
      playlistId: playlistID,
      ...(pageToken ? { pageToken } : {})
    })

    if (!items || items.length < 1) {
      break
    }

    yield* items.filter(
      (item): item is FilteredYouTubePlaylistItem =>
        typeof item.contentDetails?.videoId === 'string'
    )

    if (!all || !nextPageToken) {
      break
    }

    pageToken = nextPageToken
  }
}

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

export async function* getVideos({
  ids
}: GetVideosOptions): AsyncGenerator<FilteredYouTubeVideo, void, undefined> {
  for (let i = 0; i < ids.length; i += YOUTUBE_DATA_API_MAX_RESULTS) {
    const {
      data: { items }
    } = await youtubeClient.videos.list({
      id: ids.slice(i, i + YOUTUBE_DATA_API_MAX_RESULTS - 1),
      maxResults: YOUTUBE_DATA_API_MAX_RESULTS,
      part: ['contentDetails', 'liveStreamingDetails', 'snippet']
    })

    if (!items || items.length < 1) {
      continue
    }

    yield* items.filter(
      (item): item is FilteredYouTubeVideo =>
        typeof item.id === 'string' &&
        typeof item.snippet?.publishedAt === 'string' &&
        'contentDetails' in item
    )
  }
}
