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
 * Video result from database operations
 */
export type VideoTalent = Pick<Tables<'talents'>, 'name'>

export type VideoThumbnail = Omit<
  Tables<'thumbnails'>,
  'created_at' | 'deleted_at' | 'etag' | 'id' | 'updated_at'
>

export type Video = Pick<
  Tables<'videos'>,
  'duration' | 'id' | 'published_at' | 'status' | 'title'
> & {
  talent: VideoTalent | null
  thumbnail?: VideoThumbnail | null
  youtube_video?: {
    youtube_video_id: string
  }
}
