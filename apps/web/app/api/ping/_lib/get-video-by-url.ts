import { supabaseClient } from '@/lib/supabase'
import type { Video } from './types'

function getYouTubeVideoID(url: URL): string {
  let videoID: string | undefined

  if (url.host === 'youtu.be') {
    videoID = url.pathname.slice(1) || undefined
  } else if (url.pathname.startsWith('/live/')) {
    videoID = url.pathname.split('/').at(2) || undefined
  } else if (url.pathname === '/watch') {
    videoID = url.searchParams.get('v') || undefined
  }

  if (!videoID) {
    throw new TypeError('Video ID is unknown.')
  }

  return videoID
}

export default async function getVideoByURL(url: URL): Promise<Video> {
  if (!['www.youtube.com', 'youtube.com', 'youtu.be'].includes(url.host)) {
    throw new TypeError('URLs not supported were given.')
  }

  const videoID = getYouTubeVideoID(url)

  const { data: video, error } = await supabaseClient
    .from('videos')
    .select(
      'talent:talents!inner (id, name), id, title, youtube_video:youtube_videos!inner(youtube_video_id)',
    )
    .eq('youtube_video.youtube_video_id', videoID)
    .single()

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return video
}
