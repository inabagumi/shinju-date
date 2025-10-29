import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { range } from '@shinju-date/helpers'
import { formatDate } from '@shinju-date/temporal-fns'
import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

export type VideoDetail = {
  id: number
  slug: string
  title: string
  visible: boolean
  deleted_at: string | null
  published_at: string
  updated_at: string
  created_at: string
  duration: string
  channel_id: number
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
  clicks: number
  channel: {
    id: number
    name: string
    slug: string
  }
}

const getVideo = cache(async function getVideo(
  slug: string,
): Promise<VideoDetail | null> {
  const supabaseClient = await createSupabaseServerClient()

  const { data: video, error } = await supabaseClient
    .from('videos')
    .select(
      'id, slug, title, visible, deleted_at, published_at, updated_at, created_at, duration, channel_id, thumbnails(path, blur_data_url), channels(id, name, slug)',
    )
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found
      return null
    }
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  if (!video) {
    return null
  }

  // Get last 7 days in JST timezone for click count
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const days = range(7).map((i) => {
    const date = today.subtract({ days: i })
    return formatDate(date)
  })

  // Fetch click counts for the video for the last 7 days
  const scores = await Promise.all(
    days.map((day) =>
      redisClient.zscore(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}${day}`, slug),
    ),
  )

  const totalClicks = scores.reduce<number>(
    (sum, score) => sum + (typeof score === 'number' ? score : 0),
    0,
  )

  return {
    channel: video.channels,
    channel_id: video.channel_id,
    clicks: totalClicks,
    created_at: video.created_at,
    deleted_at: video.deleted_at,
    duration: video.duration,
    id: video.id,
    published_at: video.published_at,
    slug: video.slug,
    thumbnail: video.thumbnails,
    title: video.title,
    updated_at: video.updated_at,
    visible: video.visible,
  }
})

export default getVideo
