import type { Tables } from '@shinju-date/database'

/**
 * Saved youtube channel data from the database
 */
export type SavedYouTubeChannel = Pick<
  Tables<'youtube_channels'>,
  'id' | 'channel_id' | 'youtube_channel_id'
>

/**
 * Saved thumbnail data from the database
 */
export type SavedThumbnail = Omit<Tables<'thumbnails'>, 'created_at'>

/**
 * Saved video data from the database
 */
export type SavedVideo = Omit<Tables<'videos'>, 'channel_id' | 'updated_at'> & {
  thumbnails: SavedThumbnail | SavedThumbnail[] | null
  youtube_video?: { youtube_video_id: string } | null
}

/**
 * Re-export YouTube types from the youtube-scraper package
 */
export type { YouTubeChannel, YouTubeVideo } from '@shinju-date/youtube-scraper'
