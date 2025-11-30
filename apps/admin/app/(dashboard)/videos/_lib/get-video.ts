import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { range } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

export type VideoDetail = {
  id: string
  title: string
  visible: boolean
  deleted_at: string | null
  published_at: string
  updated_at: string
  created_at: string
  status: Tables<'videos'>['status']
  duration: string
  thumbnail: {
    id: string
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

const getVideo = cache(async function getVideo(
  id: string,
): Promise<VideoDetail | null> {
  const supabaseClient = await createSupabaseServerClient()

  const { data: video, error } = await supabaseClient
    .from('videos')
    .select(
      'id, title, visible, deleted_at, published_at, updated_at, created_at, status, duration, thumbnail:thumbnails(id, path, blur_data_url), talent:talents(id, name), youtube_video:youtube_videos(youtube_video_id)',
    )
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found
      return null
    }
    // Check for invalid UUID format error
    if (
      error.message?.includes('invalid input syntax for type uuid') ||
      error.code === '22P02'
    ) {
      // Invalid UUID format - treat as not found
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
    return formatDateKey(date)
  })

  const redisClient = getRedisClient()

  // Fetch click counts for the video for the last 7 days
  // Using video.id as the Redis key (matches the write side in increment.ts)
  let totalClicks = 0
  try {
    const scores = await Promise.all(
      days.map((day) =>
        redisClient.zscore(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}${day}`, video.id),
      ),
    )

    totalClicks = scores.reduce<number>(
      (sum, score) => sum + (typeof score === 'number' ? score : 0),
      0,
    )
  } catch (error) {
    // If Redis connection fails, return 0 clicks but don't fail the whole request
    logger.error('動画のクリック数の取得に失敗しました', {
      error,
      videoId: video.id,
    })
    totalClicks = 0
  }

  return {
    clicks: totalClicks,
    created_at: video.created_at,
    deleted_at: video.deleted_at,
    duration: video.duration,
    id: video.id,
    published_at: video.published_at,
    status: video.status,
    talent: video.talent,
    thumbnail: video.thumbnail,
    title: video.title,
    updated_at: video.updated_at,
    visible: video.visible,
    youtube_video: video.youtube_video,
  }
})

export default getVideo
