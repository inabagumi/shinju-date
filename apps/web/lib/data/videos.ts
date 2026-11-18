'use server'

import { CACHE_TAGS, TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { startOfHour, toDBString } from '@shinju-date/temporal-fns'
import type { QueryData } from '@supabase/supabase-js'
import { cacheLife, cacheTag } from 'next/cache'
import { VIDEO_CALENDAR_SELECT, VIDEO_LIST_SELECT } from '@/lib/data/selects'
import { unwrap } from '@/lib/data/unwrap'
import { SEARCH_RESULT_COUNT } from '@/lib/site'
import { supabaseClient } from '@/lib/supabase'
import { getVideoKinds, type VideoKindFilter } from '@/lib/video-kind-filter'
import { hasPlatformSource } from '@/lib/video-url'

/**
 * The query of the videos of the video cards, which the type of the rows is
 * derived from. The filters are added to it by each fetcher.
 */
function selectVideos() {
  return supabaseClient.from('videos').select(VIDEO_LIST_SELECT)
}

/** A video of the video cards */
export type Video = QueryData<ReturnType<typeof selectVideos>>[number]

export type Thumbnail = NonNullable<Video['thumbnail']>

export type YouTubeChannel = NonNullable<
  Video['youtube_video']
>['youtube_channel']

export type TwitchUser = NonNullable<Video['twitch_video']>['twitch_user']

export interface UpcomingVideos {
  /**
   * 取得した時点の `TIME_ZONE` での日付（`YYYY-MM-DD`）。
   * キャッシュされた結果を描画するサーバーと、それをハイドレートするブラウザで
   * 「今日」「明日」の基準を揃えるために使う
   */
  today: string
  videos: Video[]
}

export const fetchUpcomingVideos = async (): Promise<UpcomingVideos> => {
  'use cache: remote'

  cacheLife('hours')
  cacheTag(CACHE_TAGS.VIDEOS)

  const baseTime = startOfHour(Temporal.Now.zonedDateTimeISO(TIME_ZONE))
  const until = baseTime.add({
    weeks: 1,
  })

  // An upcoming stream that should have started before this hour is left out,
  // as `fetchTalentStreamStatuses` does, so the streams that never started do
  // not take up the limit. The nearest ones are kept when there are more.
  const videos = unwrap(
    await selectVideos()
      .eq('status', 'UPCOMING')
      .gte('published_at', toDBString(baseTime))
      .lte('published_at', toDBString(until))
      .order('published_at', {
        ascending: true,
      })
      .limit(100),
    'fetchUpcomingVideos',
  )

  return {
    today: baseTime.toPlainDate().toJSON(),
    videos: videos.filter(hasPlatformSource),
  }
}

/**
 * The current time in `TIME_ZONE`, as the string of a
 * `Temporal.ZonedDateTime`. The server and the browser start rendering from
 * it (the first value of `useNow` and the reference date of the search
 * results), so the hydration does not differ from the server. The browser
 * switches to its own clock after the hydration.
 *
 * It is cached as long as the videos (`fetchVideos`) are, as it is rendered
 * with them.
 */
export const fetchCurrentTime = async (): Promise<string> => {
  'use cache: remote'

  cacheLife('hours')

  return Temporal.Now.zonedDateTimeISO(TIME_ZONE).toString()
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
  kind?: VideoKindFilter
  query?: string
  /** 絞り込むタレントの ID。空のときはすべてのタレントが対象になる */
  talentIds?: string[]
  until?: bigint | undefined
}

export const fetchVideos = async ({
  kind = 'all',
  query = '',
  talentIds = [],
  until,
}: FetchVideosOptions): Promise<Video[]> => {
  'use cache: remote'

  cacheLife('hours')
  cacheTag(CACHE_TAGS.VIDEOS)

  const baseTime = until
    ? Temporal.Instant.fromEpochNanoseconds(until)
    : await getDefaultBaseTime()
  const videoKinds = getVideoKinds(kind)
  const videos = unwrap(
    await supabaseClient
      .rpc('search_videos_v3', {
        channel_ids: talentIds,
        perpage: SEARCH_RESULT_COUNT,
        query,
        until: baseTime.toJSON(),
        ...(videoKinds ? { video_kinds: videoKinds } : {}),
      })
      .select(VIDEO_LIST_SELECT),
    'fetchVideos',
  )

  // `search_videos_v3` leaves out the videos without a YouTube or Twitch
  // video, and `count_videos_v1` counts the same videos. They are not left out
  // here by `hasPlatformSource`: a page shorter than `SEARCH_RESULT_COUNT` ends
  // the search results. The video cards do not show the videos that cannot be
  // linked to.
  return videos
}

interface CountVideosOptions {
  kind?: VideoKindFilter
  query?: string
  /** 絞り込むタレントの ID。空のときはすべてのタレントが対象になる */
  talentIds?: string[]
}

/**
 * Count the videos `fetchVideos` pages through for the given query, kind and
 * talents.
 */
export const countVideos = async ({
  kind = 'all',
  query = '',
  talentIds = [],
}: CountVideosOptions): Promise<number> => {
  'use cache: remote'

  cacheLife('hours')
  cacheTag(CACHE_TAGS.VIDEOS)

  const baseTime = await getDefaultBaseTime()
  const videoKinds = getVideoKinds(kind)

  return unwrap(
    await supabaseClient.rpc('count_videos_v1', {
      channel_ids: talentIds,
      query,
      until: baseTime.toJSON(),
      ...(videoKinds ? { video_kinds: videoKinds } : {}),
    }),
    'countVideos',
  )
}

/** The query of the videos of the calendars, which the type is derived from */
function selectCalendarVideos() {
  return supabaseClient.from('videos').select(VIDEO_CALENDAR_SELECT)
}

/** A video of the calendars (`/videos.ics` and `/talents/[id].ics`) */
export type CalendarVideo = QueryData<
  ReturnType<typeof selectCalendarVideos>
>[number]

interface FetchCalendarVideosOptions {
  /** 動画の種別。`all` では絞り込まない */
  kind?: VideoKindFilter
  /**
   * タレントの ID。空のときは絞り込まない。同じ条件でキャッシュが分かれない
   * よう、並べ替えて重複を除いてから渡す
   */
  talentIds?: readonly string[]
}

/**
 * Fetch up to 100 videos published until a week later, from the latest, for
 * the calendars.
 *
 * The calendar also has the past videos, so there is no lower bound. They are
 * sorted from the latest, so the oldest ones are dropped at the limit.
 */
export const fetchCalendarVideos = async ({
  kind = 'all',
  talentIds = [],
}: FetchCalendarVideosOptions = {}): Promise<CalendarVideo[]> => {
  'use cache: remote'

  cacheLife('hours')
  cacheTag(CACHE_TAGS.VIDEOS)

  const until = startOfHour(Temporal.Now.zonedDateTimeISO(TIME_ZONE)).add({
    days: 7,
  })
  let query = selectCalendarVideos().lt('published_at', toDBString(until))

  if (talentIds.length > 0) {
    query = query.in('talent_id', [...talentIds])
  }

  if (kind !== 'all') {
    query = query.eq('video_kind', kind)
  }

  const videos = unwrap(
    await query
      .order('published_at', {
        ascending: false,
      })
      .limit(100),
    'fetchCalendarVideos',
  )

  return videos.filter(hasPlatformSource)
}

/** The condition of the videos of a section of the dashboard */
interface DashboardVideosCondition {
  /** The most videos to fetch */
  limit: number
  /**
   * `only` for the shorts only, `exclude` for the videos but the shorts. The
   * videos are not narrowed by the kind when omitted.
   */
  shorts?: 'exclude' | 'only'
  status: Tables<'videos'>['status']
  /**
   * The videos published within these hours until now. The videos are not
   * narrowed by the time when omitted.
   */
  withinHours?: number
}

/**
 * Fetch the videos of a section of the dashboard that match `condition`, from
 * the latest.
 */
async function fetchDashboardSectionVideos({
  limit,
  shorts,
  status,
  withinHours,
}: DashboardVideosCondition): Promise<Video[]> {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag(CACHE_TAGS.VIDEOS)

  let query = selectVideos().eq('status', status)

  if (shorts === 'only') {
    query = query.eq('video_kind', 'short')
  } else if (shorts === 'exclude') {
    query = query.neq('video_kind', 'short')
  }

  if (withinHours !== undefined) {
    const now = Temporal.Now.instant()
    const since = now.subtract({ hours: withinHours })

    query = query
      .gte('published_at', toDBString(since))
      .lte('published_at', toDBString(now))
  }

  const videos = unwrap(
    await query.order('published_at', { ascending: false }).limit(limit),
    'fetchDashboardVideos',
  )

  return videos.filter(hasPlatformSource)
}

/** The currently streaming (`LIVE`) videos */
const LIVE_VIDEOS_CONDITION: DashboardVideosCondition = {
  limit: 10,
  status: 'LIVE',
}

/**
 * The recent regular uploads (within 3 days, excluding shorts). Completed
 * livestreams remain in the live-stream lifecycle and are not presented as
 * newly uploaded videos.
 */
const RECENT_VIDEOS_CONDITION: DashboardVideosCondition = {
  limit: 10,
  shorts: 'exclude',
  status: 'PUBLISHED',
  withinHours: 24 * 3,
}

/** The recent shorts (within 1 day) */
const SHORTS_VIDEOS_CONDITION: DashboardVideosCondition = {
  limit: 20,
  shorts: 'only',
  status: 'PUBLISHED',
  withinHours: 24,
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
    fetchDashboardSectionVideos(LIVE_VIDEOS_CONDITION),
    fetchDashboardSectionVideos(RECENT_VIDEOS_CONDITION),
    fetchDashboardSectionVideos(SHORTS_VIDEOS_CONDITION),
  ])

  return {
    live,
    recent,
    shorts,
  }
}
