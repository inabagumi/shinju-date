import type { Tables } from '@shinju-date/database'

/**
 * Saved youtube channel data from the database
 */
export type SavedYouTubeChannel = Pick<
  Tables<'youtube_channels'>,
  'id' | 'talent_id' | 'youtube_channel_id'
>

/**
 * Saved Twitch user data from the database
 */
export type SavedTwitchUser = Pick<
  Tables<'twitch_users'>,
  'id' | 'name' | 'talent_id' | 'twitch_login_name' | 'twitch_user_id'
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
  twitch_video?: Pick<
    Tables<'twitch_videos'>,
    'stream_id' | 'twitch_video_id' | 'type'
  > | null
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
  twitch_video?: {
    stream_id?: string | null
    twitch_video_id: string
    type: Tables<'twitch_videos'>['type']
  }
  youtube_video?: {
    youtube_video_id: string
  }
}
