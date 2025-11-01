import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { range } from '@shinju-date/helpers'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'
import { escapeSearchString } from './escape-search'

export type Video = {
  id: string
  title: string
  visible: boolean
  deleted_at: string | null
  published_at: string
  updated_at: string
  duration: string
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
  clicks: number
  talent: {
    id: string
    name: string
  }
  youtube_video: {
    youtube_video_id: string
  } | null
}

export type VideoFilters = {
  talentId?: string
  deleted?: boolean
  visible?: boolean
  search?: string
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
  const supabaseClient = await createSupabaseServerClient()

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Start building the query
  let query = supabaseClient
    .from('videos')
    .select(
      'id, title, visible, deleted_at, published_at, updated_at, duration, thumbnail:thumbnails(path, blur_data_url), talent:channels(id, name), youtube_video:youtube_videos(youtube_video_id)',
      { count: 'exact' },
    )

  // Apply filters
  if (filters?.talentId) {
    query = query.eq('channel_id', filters.talentId)
  }
  if (filters?.visible !== undefined) {
    query = query.eq('visible', filters.visible)
  }
  // Handle text search
  if (filters?.search) {
    const escapedSearch = escapeSearchString(filters.search)
    query = query.ilike('title', `%${escapedSearch}%`)
  }
  // Handle deleted filter
  if (filters?.deleted === true) {
    // Show only deleted videos
    query = query.not('deleted_at', 'is', null)
  } else if (filters?.deleted === false) {
    // Show only non-deleted videos
    query = query.is('deleted_at', null)
  }
  // If deleted is undefined, show all videos (both deleted and non-deleted)

  // Fetch videos from Supabase with pagination
  const {
    data: videos,
    error,
    count,
  } = await query
    .order(sortField, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  if (!videos) {
    return { total: 0, videos: [] }
  }

  // Get last 7 days in JST timezone
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const days = range(7).map((i) => {
    const date = today.subtract({ days: i })
    return formatDate(date)
  })

  // Fetch click counts for all videos for the last 7 days
  // Using video.id as the Redis key (matches the write side in increment.ts)
  const videoIds = videos.map((video) => video.id)
  const clickCounts = await Promise.all(
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

  // Combine video data with click counts
  const videosWithClicks: Video[] = videos.map((video, index) => ({
    clicks: clickCounts[index] ?? 0,
    deleted_at: video.deleted_at,
    duration: video.duration,
    id: video.id,
    published_at: video.published_at,
    talent: video.talent,
    thumbnail: video.thumbnail,
    title: video.title,
    updated_at: video.updated_at,
    visible: video.visible,
    youtube_video: video.youtube_video,
  }))

  return {
    total: count ?? 0,
    videos: videosWithClicks,
  }
}
