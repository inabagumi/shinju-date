'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

/**
 * 人気動画のキャッシュ有効期間（秒）
 */
const POPULAR_VIDEOS_CACHE_TTL_SECONDS = 60 * 10 // 10 minutes

export type PopularVideo = {
  clicks: number
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
  title: string
  youtube_video: {
    youtube_video_id: string
  } | null
}

export async function getPopularVideos(
  limit = 10,
  days = 7,
  startDate?: string,
  endDate?: string,
): Promise<PopularVideo[]> {
  const videoScores: [string, number][] = []

  try {
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)

    // Determine date range
    let start: Temporal.PlainDate
    let end: Temporal.PlainDate

    if (startDate && endDate) {
      start = Temporal.PlainDate.from(startDate)
      end = Temporal.PlainDate.from(endDate)
      // Calculate days for cache key
      const duration = end.since(start)
      days = duration.days + 1
    } else {
      end = today.toPlainDate()
      start = end.subtract({ days: days - 1 })
    }

    const startZoned = start.toZonedDateTime({
      plainTime: Temporal.PlainTime.from('00:00:00'),
      timeZone: TIME_ZONE,
    })
    const endZoned = end.toZonedDateTime({
      plainTime: Temporal.PlainTime.from('00:00:00'),
      timeZone: TIME_ZONE,
    })
    const cacheKey = `${REDIS_KEYS.POPULAR_VIDEOS_PREFIX}${formatDate(
      startZoned,
    )}/${formatDate(endZoned)}`

    const cachedResults = await redisClient.zrange<string[]>(
      cacheKey,
      0,
      limit - 1,
      {
        rev: true,
        withScores: true,
      },
    )

    if (cachedResults.length > 0) {
      for (let i = 0; i < cachedResults.length; i += 2) {
        const videoId = cachedResults[i]
        const scoreValue = cachedResults[i + 1]
        const score =
          typeof scoreValue === 'string' ? parseInt(scoreValue, 10) : scoreValue

        if (typeof videoId !== 'string' || typeof score !== 'number') {
          continue
        }

        videoScores.push([videoId, score])
      }
    } else {
      // Build daily keys for the date range
      const dailyKeys: string[] = []
      let currentDate = start
      while (Temporal.PlainDate.compare(currentDate, end) <= 0) {
        const zonedDate = currentDate.toZonedDateTime({
          plainTime: Temporal.PlainTime.from('00:00:00'),
          timeZone: TIME_ZONE,
        })
        dailyKeys.push(
          `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${formatDate(zonedDate)}`,
        )
        currentDate = currentDate.add({ days: 1 })
      }

      if (dailyKeys.length > 0) {
        const pipeline = redisClient.multi()
        pipeline.zunionstore(cacheKey, dailyKeys.length, dailyKeys)
        pipeline.expire(cacheKey, POPULAR_VIDEOS_CACHE_TTL_SECONDS)
        await pipeline.exec()
      }

      const newResults = await redisClient.zrange<string[]>(
        cacheKey,
        0,
        limit - 1,
        {
          rev: true,
          withScores: true,
        },
      )

      for (let i = 0; i < newResults.length; i += 2) {
        const videoId = newResults[i]
        const scoreValue = newResults[i + 1]
        const score =
          typeof scoreValue === 'string' ? parseInt(scoreValue, 10) : scoreValue

        if (typeof videoId !== 'string' || typeof score !== 'number') {
          continue
        }

        videoScores.push([videoId, score])
      }
    }
  } catch (error) {
    logger.error('Redis通信で人気動画の取得に失敗しました', {
      days,
      endDate: endDate ?? 'undefined',
      error,
      limit,
      startDate: startDate ?? 'undefined',
    })

    return []
  }

  if (videoScores.length === 0) {
    return []
  }

  const supabaseClient = await createSupabaseServerClient()

  const videoIds = videoScores.map(([id]) => id)
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select(
      'id, thumbnails(path, blur_data_url), title, youtube_video:youtube_videos(youtube_video_id)',
    )
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
        thumbnail: video.thumbnails,
        title: video.title,
        youtube_video: video.youtube_video,
      }
    })
    .filter(isNonNullable)
}
