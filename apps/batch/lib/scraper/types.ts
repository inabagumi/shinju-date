import type { Tables } from '@shinju-date/database'

/**
 * Saved youtube channel data from the database
 */
export type SavedYouTubeChannel = Pick<
  Tables<'youtube_channels'>,
  'id' | 'talent_id' | 'youtube_channel_id'
>

/**
 * Saved thumbnail data from the database
 */
export type SavedThumbnail = Omit<Tables<'thumbnails'>, 'created_at'>

/**
 * Saved video data from the database
 */
export type SavedVideo = Omit<Tables<'videos'>, 'talent_id' | 'updated_at'> & {
  thumbnail: SavedThumbnail | null
  youtube_video?: Pick<Tables<'youtube_videos'>, 'youtube_video_id'> | null
}

/**
 * Re-export YouTube types from the youtube-scraper package
 */
export type {
  YouTubeChannel,
  YouTubeVideo,
} from '@shinju-date/youtube-scraper'
