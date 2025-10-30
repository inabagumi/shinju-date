import type { Tables } from '@shinju-date/database'

export type Video = Pick<Tables<'videos'>, 'id' | 'title'> & {
  channel: Pick<Tables<'channels'>, 'id' | 'name'>
  youtube_video: Pick<Tables<'youtube_videos'>, 'youtube_video_id'> | null
}
