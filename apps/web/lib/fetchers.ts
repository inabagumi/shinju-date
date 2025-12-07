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
  youtube_video:youtube_videos!inner (youtube_video_id)
`

export type Talent = Pick<Tables<'talents'>, 'id' | 'name'>

export type Thumbnail = Pick<
  Tables<'thumbnails'>,
  'blur_data_url' | 'height' | 'id' | 'path' | 'width'
>

export type Video = Pick<
  Tables<'videos'>,
  'duration' | 'id' | 'published_at' | 'status' | 'title'
> & {
  talent: Talent
  thumbnail: Thumbnail | null
  youtube_video: Pick<Tables<'youtube_videos'>, 'youtube_video_id'>
}

export const fetchUpcomingAndLiveVideos = async (): Promise<Video[]> => {
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
    .in('status', ['LIVE', 'UPCOMING'])
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
 * Fetch currently live videos and recently published videos (within 48 hours)
 * Returns an object with separate arrays for live and recent videos
 */
export const fetchLiveAndRecentVideos = async (): Promise<{
  live: Video[]
  recent: Video[]
}> => {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag('videos')

  const now = Temporal.Now.instant()
  const fortyEightHoursAgo = now.subtract({ hours: 48 })

  // Fetch live videos
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

  // Fetch recent published videos (within 48 hours)
  const { data: recentVideos, error: recentError } = await supabaseClient
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .eq('status', 'PUBLISHED')
    .gte('published_at', toDBString(fortyEightHoursAgo))
    .lte('published_at', toDBString(now))
    .order('published_at', { ascending: false })
    .limit(10)

  if (recentError) {
    throw new TypeError(recentError.message, {
      cause: recentError,
    })
  }

  return {
    live: liveVideos,
    recent: recentVideos,
  }
}
