import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { range } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { formatDateKey } from '@shinju-date/temporal-fns'
import type { QueryData } from '@supabase/supabase-js'
import { cacheLife } from 'next/cache'
import { getRedisClient } from '@/lib/redis'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'
import { unwrap } from '@/lib/supabase/query'
import { escapeSearchString } from './escape-search'
import { VIDEO_SELECT } from './video-select'

function selectVideos(supabaseClient: TypedSupabaseClient) {
  return supabaseClient.from('videos').select(VIDEO_SELECT, { count: 'exact' })
}

type VideoRow = QueryData<ReturnType<typeof selectVideos>>[number]

export interface Video extends Omit<VideoRow, 'talent'> {
  clicks: number
  // Embedded relations may be missing (e.g. hidden by RLS or absent in mock
  // data), so consumers must handle `null`.
  talent: VideoRow['talent'] | null
}

export interface VideoFilters {
  talentId?: string[] | undefined
  deleted?: boolean[] | undefined
  visible?: boolean[] | undefined
  search?: string | undefined
  status?: Tables<'videos'>['status'][] | undefined
  platform?: Tables<'videos'>['platform'][] | undefined
  videoKind?: Tables<'videos'>['video_kind'][] | undefined
}

export type VideoSortField = 'published_at' | 'updated_at'
export type VideoSortOrder = 'asc' | 'desc'

export async function getVideos(
  page = 1,
  perPage = 20,
  filters?: VideoFilters,
  sortField: VideoSortField = 'updated_at',
  sortOrder: VideoSortOrder = 'desc',
): Promise<{
  videos: Video[]
  total: number
}> {
  'use cache: private'

  cacheLife('minutes')

  const supabaseClient = await createSupabaseServerClient()

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Start building the query
  let query = selectVideos(supabaseClient)

  // Apply filters
  if (filters?.talentId && filters.talentId.length > 0) {
    query = query.in('talent_id', filters.talentId)
  }
  if (filters?.visible && filters.visible.length > 0) {
    query = query.in('visible', filters.visible)
  }
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }
  if (filters?.platform && filters.platform.length > 0) {
    query = query.in('platform', filters.platform)
  }
  if (filters?.videoKind && filters.videoKind.length > 0) {
    query = query.in('video_kind', filters.videoKind)
  }
  // Handle text search
  if (filters?.search) {
    const escapedSearch = escapeSearchString(filters.search)
    query = query.ilike('title', `%${escapedSearch}%`)
  }
  // Handle deleted filter with OR logic
  if (filters?.deleted && filters.deleted.length > 0) {
    if (filters.deleted.length === 1) {
      // Only one value selected
      if (filters.deleted[0] === true) {
        query = query.not('deleted_at', 'is', null)
      } else {
        query = query.is('deleted_at', null)
      }
    }
    // If both true and false are selected, don't apply any filter (show all)
  }

  // Fetch videos from Supabase with pagination
  const result = await query
    .order(sortField, { ascending: sortOrder === 'asc' })
    .range(from, to)
  const videos = unwrap(result, 'getVideos') ?? []
  const { count } = result

  // Get last 7 days in JST timezone
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const days = range(7).map((i) => {
    const date = today.subtract({ days: i })
    return formatDateKey(date)
  })

  const redisClient = getRedisClient()

  // Fetch click counts for all videos for the last 7 days
  // Using video.id as the Redis key (matches the write side in increment.ts)
  const videoIds = videos.map((video) => video.id)

  // Use Promise.allSettled to handle individual video click count failures gracefully
  const clickCountResults = await Promise.allSettled(
    videoIds.map(async (id) => {
      // Sum up clicks from all 7 days
      const scores = await Promise.all(
        days.map((day) =>
          redisClient.zscore(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}${day}`, id),
        ),
      )
      return scores.reduce<number>(
        (sum, score) => sum + (typeof score === 'number' ? score : 0),
        0,
      )
    }),
  )

  // Extract click counts from results, using 0 for any failures
  const clickCounts = clickCountResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    // Log error for rejected promise
    logger.error('動画のクリック数の取得に失敗しました', {
      error: result.reason,
      videoId: videoIds[index],
    })
    return 0
  })

  // Combine video data with click counts
  const videosWithClicks: Video[] = videos.map((video, index) => ({
    ...video,
    clicks: clickCounts[index] ?? 0,
  }))

  return {
    total: count ?? 0,
    videos: videosWithClicks,
  }
}
