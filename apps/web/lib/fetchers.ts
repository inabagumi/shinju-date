'use server'

import type { Tables } from '@shinju-date/database'
import { startOfHour, toDBString } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { SEARCH_RESULT_COUNT, timeZone } from '@/lib/constants'
import { supabaseClient } from '@/lib/supabase'

const DEFAULT_SEARCH_SELECT = `
  duration,
  id,
  published_at,
  status,
  talent:channels!inner (id, name),
  thumbnail:thumbnails (blur_data_url, height, path, width),
  title,
  youtube_video:youtube_videos!inner (youtube_video_id)
`

export type Talent = Pick<Tables<'channels'>, 'id' | 'name'>

export type Thumbnail = Pick<
  Tables<'thumbnails'>,
  'blur_data_url' | 'height' | 'path' | 'width'
>

export type Video = Pick<
  Tables<'videos'>,
  'duration' | 'id' | 'published_at' | 'status' | 'title'
> & {
  talent: Talent
  thumbnail: Thumbnail | null
  youtube_video: Pick<Tables<'youtube_videos'>, 'youtube_video_id'>
}

export const fetchNotEndedVideos = async (): Promise<Video[]> => {
  const baseTime = startOfHour(Temporal.Now.zonedDateTimeISO(timeZone))
  const until = baseTime.add({
    weeks: 1,
  })

  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .neq('status', 'ENDED')
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
  const epochNanoseconds = Temporal.Now.instant().epochNanoseconds

  return Temporal.Instant.fromEpochNanoseconds(epochNanoseconds)
    .toZonedDateTimeISO(timeZone)
    .startOfDay()
    .add({
      months: 1,
    })
    .toInstant()
}

type FetchVideosOptions = {
  query?: string
  until?: bigint | undefined
}

export const fetchVideos = async ({
  query = '',
  until,
}: FetchVideosOptions): Promise<Video[]> => {
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
