import { supabaseClient } from '@/lib/supabase'
import { type Video } from './types'

function getYouTubeVideoID(url: URL): string {
  let videoID: string | undefined

  if (url.host === 'youtu.be') {
    videoID = url.pathname.slice(1) || undefined
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
    .select('channels (id, name, slug), id, slug, title')
    .eq('slug', videoID)
    .single()

  if (error) {
    throw new TypeError(error.message, {
      cause: error
    })
  }

  if (!video.channels) {
    throw new TypeError('The channel does not exist.')
  }

  return {
    ...video,
    channel: video.channels
  }
}
