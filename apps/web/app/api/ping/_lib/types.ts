import type { Tables } from '@shinju-date/database'

export type Video = Pick<Tables<'videos'>, 'id' | 'slug' | 'title'> & {
  channel: Pick<Tables<'channels'>, 'id' | 'name' | 'slug'>
  youtube_videos: Pick<Tables<'youtube_videos'>, 'youtube_video_id'> | null
}
