'use server'

import { CACHE_TAGS, TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { startOfHour, toDBString } from '@shinju-date/temporal-fns'
import { cacheLife, cacheTag } from 'next/cache'
import { SEARCH_RESULT_COUNT } from '@/lib/site'
import { STREAM_TENDENCY_DAYS } from '@/lib/stream-tendency'
import { supabaseClient } from '@/lib/supabase'
import { isUUID } from '@/lib/uuid'
import { getVideoKinds, type VideoKindFilter } from '@/lib/video-kind-filter'

const DEFAULT_SEARCH_SELECT = `
  duration,
  id,
  platform,
  published_at,
  status,
  talent:talents!inner (id, name),
  thumbnail:thumbnails (blur_data_url, height, id, path, width),
  title,
  video_kind,
  youtube_video:youtube_videos (
    youtube_video_id,
    youtube_channel:youtube_channels (
      name,
      youtube_handle,
      profile_image:profile_images (blur_data_url, id)
    )
  ),
  twitch_video:twitch_videos (
    twitch_video_id,
    type,
    twitch_user:twitch_users (
      name,
      twitch_login_name,
      profile_image:profile_images (blur_data_url, id)
    )
  )
`

export type Talent = Pick<Tables<'talents'>, 'id' | 'name'>

export type Thumbnail = Pick<
  Tables<'thumbnails'>,
  'blur_data_url' | 'height' | 'id' | 'path' | 'width'
>

/**
 * Icon of a YouTube channel or Twitch user, served from
 * `/images/profile-images/[id]`.
 */
export type ProfileImage = Pick<
  Tables<'profile_images'>,
  'blur_data_url' | 'id'
>

export interface YouTubeChannel
  extends Pick<Tables<'youtube_channels'>, 'name' | 'youtube_handle'> {
  profile_image: ProfileImage | null
}

export interface TwitchUser
  extends Pick<Tables<'twitch_users'>, 'name' | 'twitch_login_name'> {
  profile_image: ProfileImage | null
}

export type Video = Pick<
  Tables<'videos'>,
  | 'duration'
  | 'id'
  | 'platform'
  | 'published_at'
  | 'status'
  | 'title'
  | 'video_kind'
> & {
  talent: Talent
  thumbnail: Thumbnail | null
  youtube_video: {
    youtube_video_id: string
    youtube_channel: YouTubeChannel | null
  } | null
  twitch_video: {
    twitch_video_id: string
    type: Tables<'twitch_videos'>['type']
    twitch_user: TwitchUser | null
  } | null
}

function hasPlatformSource(video: {
  twitch_video: object | null
  youtube_video: object | null
}): boolean {
  return video.youtube_video != null || video.twitch_video != null
}

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
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select<string, Video>(DEFAULT_SEARCH_SELECT)
    .eq('status', 'UPCOMING')
    .gte('published_at', toDBString(baseTime))
    .lte('published_at', toDBString(until))
    .order('published_at', {
      ascending: true,
    })
    .limit(100)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return {
    today: baseTime.toPlainDate().toJSON(),
    videos: videos.filter(hasPlatformSource),
  }
}

/** The talent of a video on the schedule, with the theme color of the talent */
export type ScheduleTalent = Pick<
  Tables<'talents'>,
  'id' | 'name' | 'theme_color'
>

/**
 * A video on the schedule: a video of the video cards without the thumbnail,
 * with the theme color of the talent.
 */
export interface ScheduleVideo extends Omit<Video, 'talent' | 'thumbnail'> {
  talent: ScheduleTalent
}

const SCHEDULE_SELECT = `
  duration,
  id,
  platform,
  published_at,
  status,
  talent:talents!inner (id, name, theme_color),
  title,
  video_kind,
  youtube_video:youtube_videos (
    youtube_video_id,
    youtube_channel:youtube_channels (
      name,
      youtube_handle,
      profile_image:profile_images (blur_data_url, id)
    )
  ),
  twitch_video:twitch_videos (
    twitch_video_id,
    type,
    twitch_user:twitch_users (
      name,
      twitch_login_name,
      profile_image:profile_images (blur_data_url, id)
    )
  )
`

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

/**
 * The date (`YYYY-MM-DD` in `TIME_ZONE`) the oldest video starts on, or `null`
 * when there is no video. The schedule shows no week before it.
 */
export const fetchOldestVideoDate = async (): Promise<string | null> => {
  'use cache: remote'

  cacheLife('days')
  cacheTag(CACHE_TAGS.VIDEOS)

  const { data: video, error } = await supabaseClient
    .from('videos')
    .select('published_at')
    .order('published_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

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
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select<string, ScheduleVideo>(SCHEDULE_SELECT)
    .gte('published_at', toDBString(since))
    .lt('published_at', toDBString(until))
    .eq('video_kind', 'standard')
    .order('published_at', { ascending: true })
    .limit(1000)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return videos.filter(hasPlatformSource)
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
  const { data: videos, error } = await supabaseClient
    .rpc('search_videos_v3', {
      channel_ids: talentIds,
      perpage: SEARCH_RESULT_COUNT,
      query,
      until: baseTime.toJSON(),
      ...(videoKinds ? { video_kinds: videoKinds } : {}),
    })
    .select<string, Video>(DEFAULT_SEARCH_SELECT)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return videos.filter(hasPlatformSource)
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
  const { data: count, error } = await supabaseClient.rpc('count_videos_v1', {
    channel_ids: talentIds,
    query,
    until: baseTime.toJSON(),
    ...(videoKinds ? { video_kinds: videoKinds } : {}),
  })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return count
}

const CALENDAR_SELECT = `
  duration,
  id,
  platform,
  published_at,
  status,
  talent:talents!inner (name),
  title,
  youtube_video:youtube_videos (youtube_video_id),
  twitch_video:twitch_videos (
    twitch_video_id,
    type,
    twitch_user:twitch_users (twitch_login_name)
  )
`

/** A video of the calendars (`/videos.ics` and `/talents/[id].ics`) */
export type CalendarVideo = Pick<
  Video,
  'duration' | 'id' | 'platform' | 'published_at' | 'status' | 'title'
> & {
  talent: Pick<Talent, 'name'>
  youtube_video: Pick<
    NonNullable<Video['youtube_video']>,
    'youtube_video_id'
  > | null
  twitch_video: {
    twitch_video_id: string
    type: Tables<'twitch_videos'>['type']
    twitch_user: Pick<TwitchUser, 'twitch_login_name'> | null
  } | null
}

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
  let query = supabaseClient
    .from('videos')
    .select<string, CalendarVideo>(CALENDAR_SELECT)
    .lt('published_at', toDBString(until))

  if (talentIds.length > 0) {
    query = query.in('talent_id', [...talentIds])
  }

  if (kind !== 'all') {
    query = query.eq('video_kind', kind)
  }

  const { data: videos, error } = await query
    .order('published_at', {
      ascending: false,
    })
    .limit(100)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return videos.filter(hasPlatformSource)
}

/**
 * 活動中のタレント（ID と名前）を名前の昇順で取得する。動画一覧のタレントの
 * 絞り込みの選択肢に使う。
 */
export const fetchActiveTalents = async (): Promise<Talent[]> => {
  'use cache: remote'

  cacheLife('hours')
  cacheTag(CACHE_TAGS.TALENTS)

  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select('id, name')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('name', {
      ascending: true,
    })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return talents
}

/** お知らせのバナーに表示するのに使う列 */
export type Announcement = Pick<
  Tables<'announcements'>,
  'end_at' | 'id' | 'level' | 'message' | 'start_at'
>

/**
 * 有効で、終了が現在より後のお知らせを、作成の新しい順に10件まで取得する。
 * 開始前のお知らせも含むので、表示するものは呼ぶ側で現在の時刻から選ぶ
 * （`selectCurrentAnnouncement`）。こうすると、キャッシュしている間に開始の
 * 時刻が来たお知らせも、取得し直さずに表示できる。
 */
export const fetchActiveAnnouncements = async (): Promise<Announcement[]> => {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag(CACHE_TAGS.ANNOUNCEMENTS)

  const now = Temporal.Now.instant()

  const { data: announcements, error } = await supabaseClient
    .from('announcements')
    .select('id, message, level, start_at, end_at')
    .eq('enabled', true)
    .gt('end_at', toDBString(now))
    .order('created_at', {
      ascending: false,
    })
    .limit(10)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return announcements
}

export interface TalentYouTubeChannel
  extends Pick<
    Tables<'youtube_channels'>,
    'name' | 'youtube_channel_id' | 'youtube_handle'
  > {
  profile_image: ProfileImage | null
}

export interface TalentTwitchUser
  extends Pick<
    Tables<'twitch_users'>,
    'name' | 'twitch_login_name' | 'twitch_user_id'
  > {
  profile_image: ProfileImage | null
}

/**
 * A talent with the YouTube channels and Twitch users it has, and its theme
 * color (not validated, as it is entered by hand).
 *
 * The channels and users are sorted by their platform IDs, so a talent with
 * several of them always shows the same icon and links in the same order.
 */
export interface TalentDetail
  extends Talent,
    Pick<Tables<'talents'>, 'theme_color'> {
  twitch_users: TalentTwitchUser[]
  youtube_channels: TalentYouTubeChannel[]
}

const TALENT_DETAIL_SELECT = `
  id,
  name,
  theme_color,
  youtube_channels (
    name,
    youtube_channel_id,
    youtube_handle,
    profile_image:profile_images (blur_data_url, id)
  ),
  twitch_users (
    name,
    twitch_login_name,
    twitch_user_id,
    profile_image:profile_images (blur_data_url, id)
  )
`

function compareStrings(a: string, b: string): number {
  if (a === b) {
    return 0
  }

  return a < b ? -1 : 1
}

/**
 * Fetch an active talent (`status = 'active'` and not deleted).
 *
 * Returns `null` for IDs that are not UUIDs and for talents that do not
 * exist, are retired, or are deleted.
 */
export const fetchTalent = async (id: string): Promise<TalentDetail | null> => {
  'use cache: remote'

  cacheLife('days')
  cacheTag(CACHE_TAGS.TALENTS)

  if (!isUUID(id)) {
    return null
  }

  const { data: talent, error } = await supabaseClient
    .from('talents')
    .select<string, TalentDetail>(TALENT_DETAIL_SELECT)
    .eq('id', id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  if (!talent) {
    return null
  }

  return {
    ...talent,
    twitch_users: talent.twitch_users.toSorted((a, b) =>
      compareStrings(a.twitch_user_id, b.twitch_user_id),
    ),
    youtube_channels: talent.youtube_channels.toSorted((a, b) =>
      compareStrings(a.youtube_channel_id, b.youtube_channel_id),
    ),
  }
}

/** The icon of a YouTube channel or Twitch user of a talent */
export interface TalentAccountIcon {
  profile_image: ProfileImage | null
}

/**
 * A talent in the list of talents: the ID, the name, and the icons of its
 * YouTube channels and Twitch users to pick the icon from.
 *
 * The accounts are in the same order as `fetchTalent` returns them, so a
 * talent shows the same icon in the list and on its page.
 */
export interface TalentListItem extends Talent {
  twitch_users: TalentAccountIcon[]
  youtube_channels: TalentAccountIcon[]
}

// The platform IDs are fetched only to sort the accounts like `fetchTalent`
const TALENT_LIST_SELECT = `
  id,
  name,
  youtube_channels (
    youtube_channel_id,
    profile_image:profile_images (blur_data_url, id)
  ),
  twitch_users (
    twitch_user_id,
    profile_image:profile_images (blur_data_url, id)
  )
`

interface TalentListRow extends Talent {
  twitch_users: (TalentAccountIcon & Pick<TalentTwitchUser, 'twitch_user_id'>)[]
  youtube_channels: (TalentAccountIcon &
    Pick<TalentYouTubeChannel, 'youtube_channel_id'>)[]
}

/**
 * Fetch the active talents (`status = 'active'` and not deleted) for the list
 * of talents, sorted by reading in the order of the Japanese syllabary (the
 * column uses the `ja-x-icu` collation). Talents without a reading come last,
 * sorted by name.
 */
export const fetchTalentList = async (): Promise<TalentListItem[]> => {
  'use cache: remote'

  cacheLife('days')
  cacheTag(CACHE_TAGS.TALENTS)

  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select<string, TalentListRow>(TALENT_LIST_SELECT)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('reading', {
      ascending: true,
      nullsFirst: false,
    })
    .order('name', {
      ascending: true,
    })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return talents.map((talent) => ({
    id: talent.id,
    name: talent.name,
    twitch_users: talent.twitch_users
      .toSorted((a, b) => compareStrings(a.twitch_user_id, b.twitch_user_id))
      .map(({ profile_image }) => ({ profile_image })),
    youtube_channels: talent.youtube_channels
      .toSorted((a, b) =>
        compareStrings(a.youtube_channel_id, b.youtube_channel_id),
      )
      .map(({ profile_image }) => ({ profile_image })),
  }))
}

/** Whether a talent is streaming now, and when it streams next */
export interface TalentStreamStatus {
  /** Whether the talent has a video that is streaming now */
  isLive: boolean
  /**
   * The start (ISO 8601) of the earliest stream from the start of this hour to
   * a week later, the same end as the upcoming videos on the home page. `null`
   * while the talent is live.
   */
  nextStreamAt: string | null
}

interface TalentStreamRow
  extends Pick<Tables<'videos'>, 'published_at' | 'status' | 'talent_id'> {
  twitch_video: Pick<Tables<'twitch_videos'>, 'twitch_video_id'> | null
  youtube_video: Pick<Tables<'youtube_videos'>, 'youtube_video_id'> | null
}

// The platform videos are fetched only to skip the videos the site does not
// show, as `hasPlatformSource` does
const TALENT_STREAM_SELECT = `
  published_at,
  status,
  talent_id,
  twitch_video:twitch_videos (twitch_video_id),
  youtube_video:youtube_videos (youtube_video_id)
`

/**
 * Fetch whether each talent is streaming now and when it streams next, keyed
 * by the ID of the talent. Talents with neither are not included.
 *
 * It is cached apart from `fetchTalentList`, as it changes much more often.
 */
export const fetchTalentStreamStatuses = async (): Promise<
  Record<string, TalentStreamStatus>
> => {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag(CACHE_TAGS.VIDEOS)

  const baseTime = startOfHour(Temporal.Now.zonedDateTimeISO(TIME_ZONE))
  const until = baseTime.add({
    weeks: 1,
  })

  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select<string, TalentStreamRow>(TALENT_STREAM_SELECT)
    .in('status', ['LIVE', 'UPCOMING'])
    .lte('published_at', toDBString(until))
    .order('published_at', {
      ascending: true,
    })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  // An upcoming stream that should have started before this hour is not the
  // next one any more, while one that is a little late still is
  const since = baseTime.toInstant()
  const statuses: Record<string, TalentStreamStatus> = {}

  for (const video of videos) {
    if (video.youtube_video == null && video.twitch_video == null) {
      continue
    }

    if (
      video.status === 'UPCOMING' &&
      Temporal.Instant.compare(
        Temporal.Instant.from(video.published_at),
        since,
      ) < 0
    ) {
      continue
    }

    const status = statuses[video.talent_id] ?? {
      isLive: false,
      nextStreamAt: null,
    }

    statuses[video.talent_id] = status

    if (video.status === 'LIVE') {
      status.isLive = true
      status.nextStreamAt = null
    } else if (!status.isLive && status.nextStreamAt === null) {
      // The videos are sorted by the start, so the first one is the earliest
      status.nextStreamAt = video.published_at
    }
  }

  return statuses
}

/**
 * `fetchTalentStreamStatuses`, or no statuses when they cannot be fetched, as
 * the talents are still shown without them. The error is logged.
 */
export const fetchTalentStreamStatusesSafe = async (): Promise<
  Record<string, TalentStreamStatus>
> => {
  try {
    return await fetchTalentStreamStatuses()
  } catch (error) {
    logger.error('Failed to fetch the stream statuses of the talents', {
      error,
    })

    return {}
  }
}

/**
 * Fetch the starts (ISO 8601) of the streams a talent has finished, for the
 * tendency of its streams on its page: the regular videos (not shorts) that
 * are `ENDED`, which are the finished streams and premieres, from
 * `STREAM_TENDENCY_DAYS` days before the start of today in `TIME_ZONE` to the
 * start of today.
 *
 * Today is left out, so the result stays the same for the day it is cached.
 */
export const fetchTalentStreamStarts = async (
  talentId: string,
): Promise<string[]> => {
  'use cache: remote'

  cacheLife('days')
  cacheTag(CACHE_TAGS.VIDEOS)

  const until = Temporal.Now.zonedDateTimeISO(TIME_ZONE).startOfDay()
  const since = until.subtract({ days: STREAM_TENDENCY_DAYS })

  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select('published_at')
    .eq('talent_id', talentId)
    .eq('status', 'ENDED')
    .eq('video_kind', 'standard')
    .gte('published_at', toDBString(since))
    .lt('published_at', toDBString(until))
    .order('published_at', {
      ascending: false,
    })
    .limit(1000)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return videos.map((video) => video.published_at)
}

/**
 * Fetch currently streaming (LIVE) videos
 */
async function fetchLiveVideos(): Promise<Video[]> {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag(CACHE_TAGS.VIDEOS)

  const { data: liveVideos, error: liveError } = await supabaseClient
    .from('videos')
    .select<string, Video>(DEFAULT_SEARCH_SELECT)
    .eq('status', 'LIVE')
    .order('published_at', { ascending: false })
    .limit(10)

  if (liveError) {
    throw new TypeError(liveError.message, {
      cause: liveError,
    })
  }

  return liveVideos.filter(hasPlatformSource)
}

/**
 * Fetch recent regular uploads (within 3 days, excluding shorts).
 * Completed livestreams remain in the live-stream lifecycle and are not
 * presented as newly uploaded videos.
 */
async function fetchRecentVideos(): Promise<Video[]> {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag(CACHE_TAGS.VIDEOS)

  const now = Temporal.Now.instant()
  const threeDaysAgo = now.subtract({ hours: 24 * 3 })

  const { data: recentVideos, error: recentError } = await supabaseClient
    .from('videos')
    .select<string, Video>(DEFAULT_SEARCH_SELECT)
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

  return recentVideos.filter(hasPlatformSource)
}

/**
 * Fetch recent shorts (within 1 day)
 */
async function fetchShortsVideos(): Promise<Video[]> {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag(CACHE_TAGS.VIDEOS)

  const now = Temporal.Now.instant()
  const oneDayAgo = now.subtract({ hours: 24 })

  const { data: shortsVideos, error: shortsError } = await supabaseClient
    .from('videos')
    .select<string, Video>(DEFAULT_SEARCH_SELECT)
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

  return shortsVideos.filter(hasPlatformSource)
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
