'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'

export type KeywordForDate = {
  keyword: string
  count: number
}

/**
 * Get popular keywords for a specific date
 */
export async function getPopularKeywordsForDate(
  date: string,
  limit = 20,
): Promise<KeywordForDate[]> {
  try {
    const plainDate = Temporal.PlainDate.from(date)
    const zonedDate = plainDate.toZonedDateTime({
      plainTime: Temporal.PlainTime.from('00:00:00'),
      timeZone: TIME_ZONE,
    })
    const dateKey = formatDate(zonedDate)
    const key = `${REDIS_KEYS.SEARCH_POPULAR}:${dateKey}`

    const results = await redisClient.zrange<string[]>(key, 0, limit - 1, {
      rev: true,
      withScores: true,
    })

    const keywords: KeywordForDate[] = []
    for (let i = 0; i < results.length; i += 2) {
      const keyword = results[i]
      const scoreStr = results[i + 1]

      if (keyword && scoreStr) {
        keywords.push({
          count: Number.parseInt(scoreStr, 10),
          keyword,
        })
      }
    }

    return keywords
  } catch (error) {
    console.error('Failed to fetch keywords for date:', error)
    return []
  }
}
