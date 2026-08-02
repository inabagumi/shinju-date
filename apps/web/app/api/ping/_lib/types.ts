import type { Tables } from '@shinju-date/database'

export type Video = Pick<
  Tables<'videos'>,
  'id' | 'platform' | 'status' | 'title'
> & {
  talent: Pick<Tables<'talents'>, 'id' | 'name'>
  youtube_video: Pick<Tables<'youtube_videos'>, 'youtube_video_id'> | null
  twitch_video: {
    twitch_video_id: string
    type: Tables<'twitch_videos'>['type']
    twitch_user: Pick<Tables<'twitch_users'>, 'twitch_login_name'> | null
  } | null
}
