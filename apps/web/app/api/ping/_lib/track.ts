import { track as vercelTrack } from '@vercel/analytics/server'
import type { Video } from './types'

// Using type here because it needs to be compatible with Record<string, AllowedPropertyValues>
type TrackProperties = {
  provider: 'YouTube'
  talent_id: string
  talent_name: string
  title: string
  url: string
  video_id: string
}

function generateTrackProperties(video: Video): TrackProperties {
  if (!video.youtube_video?.youtube_video_id) {
    throw new Error('Video must have youtube_video_id')
  }
  const youtubeVideoId = video.youtube_video.youtube_video_id
  return {
    provider: 'YouTube',
    talent_id: video.talent.id,
    talent_name: video.talent.name,
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
