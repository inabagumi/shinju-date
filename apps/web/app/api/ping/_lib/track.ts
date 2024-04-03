import { track as vercelTrack } from '@vercel/analytics/server'
import { type Video } from './types'

type TrackProperties = {
  channel_id: string
  channel_name: string
  provider: 'YouTube'
  title: string
  url: string
  video_id: string
}

function generateTrackProperties(video: Video): TrackProperties {
  return {
    channel_id: video.channels.slug,
    channel_name: video.channels.name,
    provider: 'YouTube',
    title: video.title,
    url: `https://www.youtube.com/watch?v=${video.slug}`,
    video_id: video.slug
  }
}

export default async function track(
  video: Video,
  { headers }: { headers: Headers }
): Promise<void> {
  const trackProperties = generateTrackProperties(video)

  await vercelTrack('Link click', trackProperties, { headers })
}
