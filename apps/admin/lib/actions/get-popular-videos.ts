'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'

/**
 * 人気動画のキャッシュ有効期間（秒）
 */
const POPULAR_VIDEOS_CACHE_TTL_SECONDS = 60 * 10 // 10 minutes

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
): Promise<PopularVideo[]> {
  const cacheKey = `${REDIS_KEYS.POPULAR_VIDEOS_PREFIX}${days}_days`
  const videoScores: [number, number][] = []

  try {
    const cachedResults = await redisClient.zrange<number[]>(
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
        const score = cachedResults[i + 1]

        if (typeof videoId !== 'number' || typeof score !== 'number') {
          continue
        }

        videoScores.push([videoId, score])
      }
    } else {
      const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
      const dailyKeys = Array.from(
        { length: days },
        (_, i) =>
          `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${formatDate(
            today.subtract({ days: i }),
          )}`,
      )

      if (dailyKeys.length > 0) {
        await redisClient.zunionstore(cacheKey, dailyKeys.length, dailyKeys)
        await redisClient.expire(cacheKey, POPULAR_VIDEOS_CACHE_TTL_SECONDS)
      }

      const newResults = await redisClient.zrange<number[]>(
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
        const score = newResults[i + 1]

        if (typeof videoId !== 'number' || typeof score !== 'number') {
          continue
        }

        videoScores.push([videoId, score])
      }
    }
  } catch (error) {
    console.error('Failed to communicate with Redis for popular videos:', error)

    return []
  }

  if (videoScores.length === 0) {
    return []
  }

  const videoIds = videoScores.map(([id]) => id)
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select('id, slug, thumbnails(path, blur_data_url), title')
    .in('id', videoIds)

  if (error) {
    console.error('Failed to fetch video details:', error)

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
