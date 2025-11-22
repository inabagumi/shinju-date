import type { Tables } from '@shinju-date/database'

export type CheckMode = 'default' | 'recent' | 'all'

export type SavedVideo = Pick<
  Tables<'videos'>,
  'id' | 'duration' | 'published_at' | 'status' | 'title'
> & {
  thumbnail: Pick<Tables<'thumbnails'>, 'id'> | null
  youtube_video: Pick<Tables<'youtube_videos'>, 'youtube_video_id'>
}
