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
  snippet: NonNullable<youtube.Schema$Channel['snippet']> & {
    title: NonNullable<youtube.Schema$ChannelSnippet['title']>
  }
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

export interface Logger {
  debug(message: string, attributes?: Record<string, unknown>): void
  error(message: string, attributes?: Record<string, unknown>): void
  info(message: string, attributes?: Record<string, unknown>): void
  warn(message: string, attributes?: Record<string, unknown>): void
}

export interface ScraperOptions {
  youtubeClient: youtube.Youtube
  concurrency?: number
  interval?: number
  logger?: Logger
}

export interface ScrapeChannelsOptions {
  channelIDs: string[]
}

export interface ScrapeVideosOptions {
  playlistID: string
  scrapeAll?: boolean
}

export type ScrapeNewVideosParams = {
  channelIds: string[]
}

export type ScrapeUpdatedVideosParams = {
  channelIds: string[]
}
