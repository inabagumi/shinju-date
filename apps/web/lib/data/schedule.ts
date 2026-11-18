'use server'

import { CACHE_TAGS, TIME_ZONE } from '@shinju-date/constants'
import { toDBString } from '@shinju-date/temporal-fns'
import type { QueryData } from '@supabase/supabase-js'
import { cacheLife, cacheTag } from 'next/cache'
import { hasPlatformSource } from '@/lib/data/has-platform-source'
import { VIDEO_SCHEDULE_SELECT } from '@/lib/data/selects'
import { unwrap } from '@/lib/data/unwrap'
import { supabaseClient } from '@/lib/supabase'

/** The query of the videos of the schedule, which the type is derived from */
function selectScheduleVideos() {
  return supabaseClient.from('videos').select(VIDEO_SCHEDULE_SELECT)
}

/**
 * A video on the schedule: a video of the video cards without the thumbnail,
 * with the theme color of the talent.
 */
export type ScheduleVideo = QueryData<
  ReturnType<typeof selectScheduleVideos>
>[number]

/** The talent of a video on the schedule, with the theme color of the talent */
export type ScheduleTalent = ScheduleVideo['talent']

/**
 * Today (`YYYY-MM-DD` in `TIME_ZONE`). The schedule decides the current week
 * and marks today with it, and the browser switches to its own clock after
 * the hydration.
 */
export const fetchScheduleToday = async (): Promise<string> => {
  'use cache'

  cacheLife('minutes')

  return Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate().toString()
}

/**
 * The date (`YYYY-MM-DD` in `TIME_ZONE`) the oldest video starts on, or `null`
 * when there is no video. The schedule shows no week before it.
 */
export const fetchOldestVideoDate = async (): Promise<string | null> => {
  'use cache: remote'

  cacheLife('days')
  cacheTag(CACHE_TAGS.VIDEOS)

  const video = unwrap(
    await supabaseClient
      .from('videos')
      .select('published_at')
      .order('published_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    'fetchOldestVideoDate',
  )

  if (!video) {
    return null
  }

  return Temporal.Instant.from(video.published_at)
    .toZonedDateTimeISO(TIME_ZONE)
    .toPlainDate()
    .toString()
}

/**
 * Fetch the videos that start in the 7 days from `weekStart` (the Sunday,
 * `YYYY-MM-DD`) in `TIME_ZONE`: the ones on air, the upcoming ones, the ended
 * ones and the published ones, in the order of the start. Shorts are not
 * included.
 *
 * Callers pass the Sunday, so each week is cached only once.
 */
export const fetchScheduleVideos = async (
  weekStart: string,
): Promise<ScheduleVideo[]> => {
  'use cache: remote'

  cacheLife('hours')
  cacheTag(CACHE_TAGS.VIDEOS)

  const since = Temporal.PlainDate.from(weekStart).toZonedDateTime(TIME_ZONE)
  const until = since.add({ weeks: 1 })

  // 1,000 is the most rows Supabase returns for a request. A week has far
  // fewer videos.
  const videos = unwrap(
    await selectScheduleVideos()
      .gte('published_at', toDBString(since))
      .lt('published_at', toDBString(until))
      .eq('video_kind', 'standard')
      .order('published_at', { ascending: true })
      .limit(1000),
    'fetchScheduleVideos',
  )

  return videos.filter(hasPlatformSource)
}
