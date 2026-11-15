'use server'

import { SEARCH_RESULT_COUNT, TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { startOfHour, toDBString } from '@shinju-date/temporal-fns'
import { cacheLife, cacheTag } from 'next/cache'
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

function hasPlatformSource(video: Video): boolean {
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
  cacheTag('videos')

  const baseTime = startOfHour(Temporal.Now.zonedDateTimeISO(TIME_ZONE))
  const until = baseTime.add({
    weeks: 1,
  })

  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select<string, Video>(DEFAULT_SEARCH_SELECT)
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

  return {
    today: baseTime.toPlainDate().toJSON(),
    videos: videos.filter(hasPlatformSource),
  }
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
  cacheTag('videos')

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
  cacheTag('videos')

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

/**
 * 活動中のタレント（ID と名前）を名前の昇順で取得する。動画一覧のタレントの
 * 絞り込みの選択肢に使う。
 */
export const fetchActiveTalents = async (): Promise<Talent[]> => {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('talents')

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
 * A talent with the YouTube channels and Twitch users it has.
 *
 * The channels and users are sorted by their platform IDs, so a talent with
 * several of them always shows the same icon and links in the same order.
 */
export interface TalentDetail extends Talent {
  twitch_users: TalentTwitchUser[]
  youtube_channels: TalentYouTubeChannel[]
}

const TALENT_DETAIL_SELECT = `
  id,
  name,
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
  cacheTag('talents')

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

/**
 * Fetch currently streaming (LIVE) videos
 */
async function fetchLiveVideos(): Promise<Video[]> {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag('videos')

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
  cacheTag('videos')

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
  cacheTag('videos')

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
