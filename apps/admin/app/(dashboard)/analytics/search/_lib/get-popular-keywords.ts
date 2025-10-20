'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'

export type PopularKeyword = {
  keyword: string
  count: number
}

/**
 * Get the Monday of the week for a given date
 */
function getMondayOfWeek(dateTime: Temporal.ZonedDateTime): string {
  const dayOfWeek = dateTime.dayOfWeek // 1 = Monday, 7 = Sunday
  const daysToSubtract = dayOfWeek - 1
  const monday = dateTime.subtract({ days: daysToSubtract })
  return formatDate(monday)
}

/**
 * Get the most popular search keywords from Redis (weekly data)
 */
export async function getPopularKeywords(
  limit = 20,
): Promise<PopularKeyword[]> {
  try {
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const mondayOfWeek = getMondayOfWeek(now)
    const weeklyKey = `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}${mondayOfWeek}`

    // Get top keywords with scores from current week
    const results = await redisClient.zrange<string[]>(
      weeklyKey,
      0,
      limit - 1,
      {
        rev: true,
        withScores: true,
      },
    )

    // Parse results: [keyword1, score1, keyword2, score2, ...]
    const keywords: PopularKeyword[] = []
    for (let i = 0; i < results.length; i += 2) {
      const keyword = results[i]
      const scoreStr = results[i + 1]

      // Type guard to ensure we have valid data
      if (keyword && scoreStr) {
        keywords.push({
          count: Number.parseInt(scoreStr, 10),
          keyword,
        })
      }
    }

    return keywords
  } catch (error) {
    console.error('Failed to fetch popular keywords from Redis:', error)
    return []
  }
}
