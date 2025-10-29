import { track as vercelTrack } from '@vercel/analytics/server'
import type { Video } from './types'

type TrackProperties = {
  channel_id: string
  channel_name: string
  provider: 'YouTube'
  title: string
  url: string
  video_id: string
}

function generateTrackProperties(video: Video): TrackProperties {
  const youtubeVideoId = video.youtube_video?.youtube_video_id
  if (!youtubeVideoId) {
    throw new Error('Video must have youtube_video_id')
  }
  return {
    channel_id: video.channel.id,
    channel_name: video.channel.name,
    provider: 'YouTube',
    title: video.title,
    url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
    video_id: video.id,
  }
}

export default async function track(
  video: Video,
  {
    headers,
  }: {
    headers: Headers
  },
): Promise<void> {
  const trackProperties = generateTrackProperties(video)

  await vercelTrack('Link click', trackProperties, {
    headers,
  })
}
