'use server'

import { SEARCH_RESULT_COUNT, TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { startOfHour, toDBString } from '@shinju-date/temporal-fns'
import { cacheLife, cacheTag } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import { supabaseClient } from '@/lib/supabase'

const DEFAULT_SEARCH_SELECT = `
  duration,
  id,
  published_at,
  status,
  talent:talents!inner (id, name),
  thumbnail:thumbnails (blur_data_url, height, id, path, width),
  title,
  video_kind,
  youtube_video:youtube_videos!inner (youtube_video_id)
`

export type Talent = Pick<Tables<'talents'>, 'id' | 'name'>

export type Thumbnail = Pick<
  Tables<'thumbnails'>,
  'blur_data_url' | 'height' | 'id' | 'path' | 'width'
>

export type Video = Pick<
  Tables<'videos'>,
  'duration' | 'id' | 'published_at' | 'status' | 'title' | 'video_kind'
> & {
  talent: Talent
  thumbnail: Thumbnail | null
  youtube_video: Pick<Tables<'youtube_videos'>, 'youtube_video_id'>
}

export const fetchUpcomingVideos = async (): Promise<Video[]> => {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('videos')

  const baseTime = startOfHour(Temporal.Now.zonedDateTimeISO(TIME_ZONE))
  const until = baseTime.add({
    weeks: 1,
  })

  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .eq('status', 'UPCOMING')
    .lte('published_at', toDBString(until))
    .order('published_at', {
      ascending: false,
    })
    .limit(100)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return videos
}

async function getDefaultBaseTime() {
  return Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    .startOfDay()
    .add({
      months: 1,
    })
    .toInstant()
}

interface FetchVideosOptions {
  query?: string
  until?: bigint | undefined
}

export const fetchVideos = async ({
  query = '',
  until,
}: FetchVideosOptions): Promise<Video[]> => {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('videos')

  const baseTime = until
    ? Temporal.Instant.fromEpochNanoseconds(until)
    : await getDefaultBaseTime()
  const { data: videos, error } = await supabaseClient
    .rpc('search_videos_v2', {
      channel_ids: [],
      perpage: SEARCH_RESULT_COUNT,
      query,
      until: baseTime.toJSON(),
    })
    .select<string, Video>(DEFAULT_SEARCH_SELECT)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return videos.filter((video) => video.youtube_video != null)
}

/**
 * Fetch currently streaming (LIVE) videos
 */
async function fetchLiveVideos(): Promise<Video[]> {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag('videos')

  const { data: liveVideos, error: liveError } = await supabaseClient
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .eq('status', 'LIVE')
    .order('published_at', { ascending: false })
    .limit(10)

  if (liveError) {
    throw new TypeError(liveError.message, {
      cause: liveError,
    })
  }

  return liveVideos
}

/**
 * Fetch recent published videos (within 3 days, excluding shorts)
 */
async function fetchRecentVideos(): Promise<Video[]> {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag('videos')

  const now = Temporal.Now.instant()
  const threeDaysAgo = now.subtract({ hours: 24 * 3 })

  const { data: recentVideos, error: recentError } = await supabaseClient
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .eq('status', 'PUBLISHED')
    .neq('video_kind', 'short')
    .gte('published_at', toDBString(threeDaysAgo))
    .lte('published_at', toDBString(now))
    .order('published_at', { ascending: false })
    .limit(10)

  if (recentError) {
    throw new TypeError(recentError.message, {
      cause: recentError,
    })
  }

  return recentVideos
}

/**
 * Fetch recent shorts (within 1 day)
 */
async function fetchShortsVideos(): Promise<Video[]> {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag('videos')

  const now = Temporal.Now.instant()
  const oneDayAgo = now.subtract({ hours: 24 })

  const { data: shortsVideos, error: shortsError } = await supabaseClient
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .eq('video_kind', 'short')
    .eq('status', 'PUBLISHED')
    .gte('published_at', toDBString(oneDayAgo))
    .lte('published_at', toDBString(now))
    .order('published_at', { ascending: false })
    .limit(20)

  if (shortsError) {
    throw new TypeError(shortsError.message, {
      cause: shortsError,
    })
  }

  return shortsVideos
}

/**
 * Fetch videos for the dashboard section
 * Returns currently streaming videos, recently published videos, and shorts
 * Uses parallel fetching for better performance
 */
export const fetchDashboardVideos = async (): Promise<{
  live: Video[]
  recent: Video[]
  shorts: Video[]
}> => {
  const [live, recent, shorts] = await Promise.all([
    fetchLiveVideos(),
    fetchRecentVideos(),
    fetchShortsVideos(),
  ])

  return {
    live,
    recent,
    shorts,
  }
}
