import { getVideoExternalUrl } from '@shinju-date/helpers'
import { track as vercelTrack } from '@vercel/analytics/server'
import type { Video } from './types'

// Using type here because it needs to be compatible with Record<string, AllowedPropertyValues>
type TrackProperties = {
  provider: 'YouTube' | 'Twitch'
  talent_id: string
  talent_name: string
  title: string
  url: string
  video_id: string
}

function generateTrackProperties(video: Video): TrackProperties {
  const url = getVideoExternalUrl({
    platform: video.platform,
    status: video.status,
    twitchLoginName: video.twitch_video?.twitch_user?.twitch_login_name,
    twitchVideoId: video.twitch_video?.twitch_video_id,
    twitchVideoType: video.twitch_video?.type,
    youtubeVideoId: video.youtube_video?.youtube_video_id,
  })

  if (!url) {
    throw new Error('Video must have a platform-specific identifier')
  }

  return {
    provider: video.platform === 'twitch' ? 'Twitch' : 'YouTube',
    talent_id: video.talent.id,
    talent_name: video.talent.name,
    title: video.title,
    url,
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
