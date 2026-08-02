import { supabaseClient } from '@/lib/supabase'
import type { Video } from './types'

/**
 * Dynamic select strings are not parsed by supabase-js generics, so results
 * are asserted to {@link Video} after a successful (non-error) response.
 */
function buildVideoSelect({
  innerRelation,
}: {
  innerRelation?: 'youtube_video' | 'twitch_video'
} = {}): string {
  const youtubeInner = innerRelation === 'youtube_video' ? '!inner' : ''
  const twitchInner = innerRelation === 'twitch_video' ? '!inner' : ''

  return `
    talent:talents!inner (id, name),
    id,
    platform,
    status,
    title,
    youtube_video:youtube_videos${youtubeInner} (youtube_video_id),
    twitch_video:twitch_videos${twitchInner} (
      twitch_video_id,
      type,
      twitch_user:twitch_users (twitch_login_name)
    )
  `
}

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

function isYouTubeHost(host: string): boolean {
  return (
    host === 'www.youtube.com' || host === 'youtube.com' || host === 'youtu.be'
  )
}

function isTwitchHost(host: string): boolean {
  return (
    host === 'www.twitch.tv' ||
    host === 'twitch.tv' ||
    host === 'm.twitch.tv' ||
    host === 'clips.twitch.tv'
  )
}

/**
 * Path segments reserved by Twitch that are not channel logins.
 */
const TWITCH_RESERVED_PATHS = new Set([
  'videos',
  'directory',
  'downloads',
  'jobs',
  'p',
  'prime',
  'settings',
  'subscriptions',
  'turbo',
  'wallet',
])

async function getYouTubeVideoByURL(url: URL): Promise<Video> {
  const videoID = getYouTubeVideoID(url)

  const { data: video, error } = await supabaseClient
    .from('videos')
    .select(buildVideoSelect({ innerRelation: 'youtube_video' }))
    .eq('youtube_video.youtube_video_id', videoID)
    .single()

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return video as unknown as Video
}

async function getTwitchVideoByPlatformId(
  twitchVideoId: string,
): Promise<Video> {
  const { data: video, error } = await supabaseClient
    .from('videos')
    .select(buildVideoSelect({ innerRelation: 'twitch_video' }))
    .eq('twitch_video.twitch_video_id', twitchVideoId)
    .single()

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return video as unknown as Video
}

async function getTwitchVideoByURL(url: URL): Promise<Video> {
  const pathSegments = url.pathname.split('/').filter(Boolean)

  // clips.twitch.tv/<slug>
  if (url.host === 'clips.twitch.tv') {
    const clipId = pathSegments[0]
    if (!clipId) {
      throw new TypeError('Clip ID is unknown.')
    }

    return getTwitchVideoByPlatformId(clipId)
  }

  // www.twitch.tv/videos/<id>
  if (pathSegments[0] === 'videos' && pathSegments[1]) {
    return getTwitchVideoByPlatformId(pathSegments[1])
  }

  // www.twitch.tv/<channel>/clip/<slug>
  if (pathSegments[1] === 'clip' && pathSegments[2]) {
    return getTwitchVideoByPlatformId(pathSegments[2])
  }

  // www.twitch.tv/<login> — live / channel top page
  const login = pathSegments[0]?.toLowerCase()
  if (!login || pathSegments.length !== 1 || TWITCH_RESERVED_PATHS.has(login)) {
    throw new TypeError('Twitch video identifier is unknown.')
  }

  const { data: twitchUser, error: userError } = await supabaseClient
    .from('twitch_users')
    .select('id')
    .ilike('twitch_login_name', login)
    .single()

  if (userError) {
    throw new TypeError(userError.message, {
      cause: userError,
    })
  }

  const { data: linkedVideos, error: linkedError } = await supabaseClient
    .from('twitch_videos')
    .select('video_id')
    .eq('twitch_user_id', twitchUser.id)

  if (linkedError) {
    throw new TypeError(linkedError.message, {
      cause: linkedError,
    })
  }

  const videoIds = (linkedVideos ?? []).map((row) => row.video_id)
  if (videoIds.length === 0) {
    throw new TypeError('Video does not exist.')
  }

  const videoSelect = buildVideoSelect()

  // Prefer an active LIVE video for this user when available.
  const { data: liveVideo, error: liveError } = await supabaseClient
    .from('videos')
    .select(videoSelect)
    .eq('platform', 'twitch')
    .eq('status', 'LIVE')
    .in('id', videoIds)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (liveError) {
    throw new TypeError(liveError.message, {
      cause: liveError,
    })
  }

  if (liveVideo) {
    return liveVideo as unknown as Video
  }

  // Fallback: most recent video for this Twitch user (e.g. ended stream link).
  const { data: recentVideo, error: recentError } = await supabaseClient
    .from('videos')
    .select(videoSelect)
    .eq('platform', 'twitch')
    .in('id', videoIds)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentError) {
    throw new TypeError(recentError.message, {
      cause: recentError,
    })
  }

  if (!recentVideo) {
    throw new TypeError('Video does not exist.')
  }

  return recentVideo as unknown as Video
}

export default async function getVideoByURL(url: URL): Promise<Video> {
  if (isYouTubeHost(url.host)) {
    return getYouTubeVideoByURL(url)
  }

  if (isTwitchHost(url.host)) {
    return getTwitchVideoByURL(url)
  }

  throw new TypeError('URLs not supported were given.')
}
