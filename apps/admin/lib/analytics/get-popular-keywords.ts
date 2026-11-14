'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { _getPopularItemsFromRedis } from './_get-popular-items-from-redis'

export type PopularKeyword = {
  keyword: string
  count: number
}

/**
 * Get popular keywords for a single date or date range
 * @param limit - Maximum number of keywords to return
 * @param startDate - Start date as Temporal.PlainDate
 * @param endDate - End date as Temporal.PlainDate. If undefined, gets data for single date
 */
export async function getPopularKeywords(
  limit: number,
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<PopularKeyword[]> {
  const keywordScores = await _getPopularItemsFromRedis<string>(
    REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX,
    limit,
    startDate,
    endDate,
  )

  return keywordScores.map(([keyword, count]) => ({
    count: Math.round(count),
    keyword,
  }))
}
