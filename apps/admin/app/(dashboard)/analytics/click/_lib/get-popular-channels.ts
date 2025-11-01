'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

/**
 * タレントクリックデータのキャッシュ有効期間（秒）
 */
const POPULAR_TALENTS_CACHE_TTL_SECONDS = 60 * 10 // 10 minutes

export type PopularTalent = {
  clicks: number
  id: string
  name: string
  youtube_channel: {
    youtube_channel_id: string
  } | null
}

/**
 * Get popular talents based on click data for a date range
 * @param limit - Number of talents to return (default: 10)
 * @param days - Number of days (legacy parameter, ignored if startDate/endDate provided)
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD)
 */
export async function getPopularTalents(
  limit = 10,
  days = 7,
  startDate?: string,
  endDate?: string,
): Promise<PopularTalent[]> {
  const talentScores: [string, number][] = []

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
    const cacheKey = `channels:popular:cache:${formatDate(
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
        const talentId = cachedResults[i]
        const scoreValue = cachedResults[i + 1]
        const score =
          typeof scoreValue === 'string' ? parseInt(scoreValue, 10) : scoreValue

        if (typeof talentId !== 'string' || typeof score !== 'number') {
          continue
        }

        talentScores.push([talentId, score])
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
          `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${formatDate(zonedDate)}`,
        )
        currentDate = currentDate.add({ days: 1 })
      }

      if (dailyKeys.length > 0) {
        const pipeline = redisClient.multi()
        pipeline.zunionstore(cacheKey, dailyKeys.length, dailyKeys)
        pipeline.expire(cacheKey, POPULAR_TALENTS_CACHE_TTL_SECONDS)
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
        const talentId = newResults[i]
        const scoreValue = newResults[i + 1]
        const score =
          typeof scoreValue === 'string' ? parseInt(scoreValue, 10) : scoreValue

        if (typeof talentId !== 'string' || typeof score !== 'number') {
          continue
        }

        talentScores.push([talentId, score])
      }
    }
  } catch (error) {
    logger.error('Redis通信で人気タレントの取得に失敗しました', {
      days,
      endDate: endDate ?? 'undefined',
      error,
      limit,
      startDate: startDate ?? 'undefined',
    })

    return []
  }

  if (talentScores.length === 0) {
    return []
  }

  const supabaseClient = await createSupabaseServerClient()

  const talentIds = talentScores.map(([id]) => id)
  const { data: talents, error } = await supabaseClient
    .from('channels')
    .select('id, name, youtube_channel:youtube_channels(youtube_channel_id)')
    .in('id', talentIds)

  if (error) {
    logger.error('タレントの詳細取得に失敗しました', {
      error,
      talentIds: talentIds.join(','),
    })

    return []
  }

  const talentMap = new Map(talents.map((c) => [c.id, c]))

  return talentScores
    .map(([id, clicks]) => {
      const talent = talentMap.get(id)
      if (!talent) return null

      return {
        clicks,
        id: talent.id,
        name: talent.name,
        youtube_channel: talent.youtube_channel,
      }
    })
    .filter(isNonNullable)
}
