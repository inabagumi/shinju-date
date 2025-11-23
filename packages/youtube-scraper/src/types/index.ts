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

export interface GetChannelsOptions {
  ids: string[]
}

export interface GetPlaylistItemsOptions {
  all?: boolean
  playlistID: string
}

export interface GetVideosOptions {
  ids: string[]
}

export interface ScraperOptions {
  youtubeClient: youtube.Youtube
}

export interface ScrapeChannelsOptions {
  channelIDs: string[]
}

export interface ScrapeVideosOptions {
  playlistID: string
  scrapeAll?: boolean
}
