import { createSupabaseServerClient } from '@/lib/supabase'

export type RecentVideo = {
  id: string
  title: string
  published_at: string
  visible: boolean
  deleted_at: string | null
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
  youtube_video: {
    youtube_video_id: string
  } | null
}

export default async function getRecentVideosForChannel(
  channelId: string,
  limit = 5,
): Promise<RecentVideo[]> {
  const supabaseClient = await createSupabaseServerClient()

  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select(
      'id, title, published_at, visible, deleted_at, thumbnails(path, blur_data_url), youtube_video:youtube_videos(youtube_video_id)',
    )
    .eq('channel_id', channelId)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return (
    videos?.map((video) => ({
      deleted_at: video.deleted_at,
      id: video.id,
      published_at: video.published_at,
      thumbnail: video.thumbnails,
      title: video.title,
      visible: video.visible,
      youtube_video: video.youtube_video,
    })) || []
  )
}
