'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { Temporal } from 'temporal-polyfill'
import { createSupabaseServerClient } from '@/lib/supabase'
import { _getPopularItemsFromRedis } from './_get-popular-items-from-redis'

export type PopularVideo = {
  clicks: number
  slug: string
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
  title: string
}

export async function getPopularVideos(
  limit = 10,
  days = 7,
  startDate?: string,
  endDate?: string,
): Promise<PopularVideo[]> {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)

  // Determine date range
  let start: string
  let end: string | undefined

  if (startDate && endDate) {
    start = startDate
    end = endDate
  } else {
    const endPlainDate = today.toPlainDate()
    const startPlainDate = endPlainDate.subtract({ days: days - 1 })
    start = startPlainDate.toString()
    end = endPlainDate.toString()
  }

  const videoScores = await _getPopularItemsFromRedis<number>(
    REDIS_KEYS.CLICK_VIDEO_PREFIX,
    REDIS_KEYS.POPULAR_VIDEOS_PREFIX,
    limit,
    start,
    end,
  )

  if (videoScores.length === 0) {
    return []
  }

  const supabaseClient = await createSupabaseServerClient()

  const videoIds = videoScores.map(([id]) => id)
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select('id, slug, thumbnails(path, blur_data_url), title')
    .in('id', videoIds)

  if (error) {
    logger.error('動画の詳細取得に失敗しました', {
      error,
      videoIds: videoIds.join(','),
    })

    return []
  }

  const videoMap = new Map(videos.map((v) => [v.id, v]))

  return videoScores
    .map(([id, clicks]) => {
      const video = videoMap.get(id)
      if (!video) return null

      return {
        clicks,
        slug: video.slug,
        thumbnail: video.thumbnails,
        title: video.title,
      }
    })
    .filter(isNonNullable)
}
