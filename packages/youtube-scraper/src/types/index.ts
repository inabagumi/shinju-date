import type { youtube_v3 as youtube } from '@googleapis/youtube'

type NonNullableChannelContentDetails =
  NonNullable<youtube.Schema$ChannelContentDetails>

type NonNullableChannelRelatedPlaylists = NonNullable<
  NonNullableChannelContentDetails['relatedPlaylists']
>

export type YouTubeChannel = youtube.Schema$Channel & {
  contentDetails: NonNullableChannelContentDetails & {
    relatedPlaylists: NonNullableChannelRelatedPlaylists & {
      uploads: NonNullable<NonNullableChannelRelatedPlaylists['uploads']>
    }
  }
  id: NonNullable<youtube.Schema$Channel['id']>
}

export type YouTubePlaylistItem = youtube.Schema$PlaylistItem & {
  contentDetails: NonNullable<youtube.Schema$PlaylistItemContentDetails> & {
    videoId: NonNullable<youtube.Schema$PlaylistItemContentDetails['videoId']>
  }
}

export type YouTubeVideo = youtube.Schema$Video & {
  contentDetails: NonNullable<youtube.Schema$Video['contentDetails']>
  id: NonNullable<youtube.Schema$Video['id']>
  snippet: NonNullable<youtube.Schema$Video['snippet']> & {
    publishedAt: NonNullable<youtube.Schema$VideoSnippet['publishedAt']>
  }
}

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

export type ScraperOptions = {
  youtubeClient: youtube.Youtube
  concurrency?: number
}

export type ScrapeChannelsOptions = {
  channelIDs: string[]
}

export type ScrapeVideosOptions = {
  playlistID: string
  scrapeAll?: boolean
}

export type ScrapeNewVideosParams = {
  playlistId: string
}

export type ScrapeUpdatedVideosParams = {
  playlistId: string
}
