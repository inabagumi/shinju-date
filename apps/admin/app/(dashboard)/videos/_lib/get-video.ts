import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { range } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { formatDateKey } from '@shinju-date/temporal-fns'
import type { QueryData } from '@supabase/supabase-js'
import { cache } from 'react'
import { getRedisClient } from '@/lib/redis'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'
import { VIDEO_SELECT } from './video-select'

const VIDEO_DETAIL_SELECT = `${VIDEO_SELECT}, created_at` as const

function selectVideo(supabaseClient: TypedSupabaseClient, id: string) {
  return supabaseClient
    .from('videos')
    .select(VIDEO_DETAIL_SELECT)
    .eq('id', id)
    .single()
}

type VideoDetailRow = QueryData<ReturnType<typeof selectVideo>>

export interface VideoDetail extends Omit<VideoDetailRow, 'talent'> {
  clicks: number
  // Embedded relations may be missing (e.g. hidden by RLS or absent in mock
  // data), so consumers must handle `null`.
  talent: VideoDetailRow['talent'] | null
}

const getVideo = cache(async function getVideo(
  id: string,
): Promise<VideoDetail | null> {
  const supabaseClient = await createSupabaseServerClient()

  const { data: video, error } = await selectVideo(supabaseClient, id)

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

  return { ...video, clicks: totalClicks }
})

export default getVideo
