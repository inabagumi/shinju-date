'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { _getPopularItemsFromRedis } from './_get-popular-items-from-redis'

export interface PopularKeyword {
  keyword: string
  count: number
}

/**
 * Get popular keywords for a single date or date range
 * @param limit - Maximum number of keywords to return
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD). If undefined, gets data for single date
 */
export async function getPopularKeywords(
  limit: number,
  startDate: string,
  endDate?: string,
): Promise<PopularKeyword[]> {
  const keywordScores = await _getPopularItemsFromRedis<string>(
    REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX,
    limit,
    Temporal.PlainDate.from(startDate),
    endDate ? Temporal.PlainDate.from(endDate) : undefined,
  )

  return keywordScores.map(([keyword, count]) => ({
    count: Math.round(count),
    keyword,
  }))
}
