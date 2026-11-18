import type { youtube_v3 as youtube } from '@googleapis/youtube'

/**
 * Runs one API request, e.g. once a slot of a queue that bounds the requests
 * in flight is free.
 */
export type RequestScheduler = <T>(request: () => Promise<T>) => Promise<T>

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

export interface YouTubePlaylistItemsPage {
  items: FilteredYouTubePlaylistItem[]
  /** Token of the next page, or `null` when this was the last one. */
  nextPageToken: string | null
}
