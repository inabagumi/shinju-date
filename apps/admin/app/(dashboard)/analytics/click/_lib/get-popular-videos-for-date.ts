'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

export type PopularVideoForDate = {
  clicks: number
  slug: string
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
  title: string
}

/**
 * Get popular videos for a specific date
 */
export async function getPopularVideosForDate(
  date: string,
  limit = 20,
): Promise<PopularVideoForDate[]> {
  try {
    const plainDate = Temporal.PlainDate.from(date)
    const zonedDate = plainDate.toZonedDateTime({
      plainTime: Temporal.PlainTime.from('00:00:00'),
      timeZone: TIME_ZONE,
    })
    const dateKey = formatDate(zonedDate)
    const key = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`

    const results = await redisClient.zrange<number[]>(key, 0, limit - 1, {
      rev: true,
      withScores: true,
    })

    const videoScores: [number, number][] = []
    for (let i = 0; i < results.length; i += 2) {
      const videoId = results[i]
      const score = results[i + 1]

      if (typeof videoId !== 'number' || typeof score !== 'number') {
        continue
      }

      videoScores.push([videoId, score])
    }

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
      logger.error('動画の詳細取得に失敗しました', error, {
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
  } catch (error) {
    logger.error('日付別の人気動画取得に失敗しました', error, {
      date,
      limit,
    })
    return []
  }
}
