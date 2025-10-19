import { TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'

export type Video = {
  slug: string
  title: string
  visible: boolean
  deleted_at: string | null
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
  clicks: number
}

export async function getVideos(
  page = 1,
  perPage = 20,
): Promise<{
  videos: Video[]
  total: number
}> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Fetch videos from Supabase with pagination
  const {
    data: videos,
    error,
    count,
  } = await supabaseClient
    .from('videos')
    .select(
      'slug, title, visible, deleted_at, thumbnails(path, blur_data_url)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  if (!videos) {
    return { total: 0, videos: [] }
  }

  // Get today's date in JST timezone
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const keySuffix = formatDate(today)

  // Fetch click counts for all videos
  const videoIds = videos.map((video) => video.slug)
  const clickCounts = await Promise.all(
    videoIds.map(async (slug) => {
      const score = await redisClient.zscore(
        `videos:clicked:${keySuffix}`,
        slug,
      )
      return typeof score === 'number' ? score : 0
    }),
  )

  // Combine video data with click counts
  const videosWithClicks: Video[] = videos.map((video, index) => ({
    clicks: clickCounts[index] ?? 0,
    deleted_at: video.deleted_at,
    slug: video.slug,
    thumbnail: video.thumbnails,
    title: video.title,
    visible: video.visible,
  }))

  return {
    total: count ?? 0,
    videos: videosWithClicks,
  }
}
