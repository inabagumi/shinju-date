'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { _getPopularItemsFromRedis } from './_get-popular-items-from-redis'

export type PopularKeyword = {
  keyword: string
  count: number
}

/**
 * Get popular keywords for a single date or date range
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD). If undefined, gets data for single date
 * @param limit - Maximum number of keywords to return (default: 20)
 */
export async function getPopularKeywords(
  startDate: string,
  endDate?: string,
  limit = 20,
): Promise<PopularKeyword[]> {
  const keywordScores = await _getPopularItemsFromRedis<string>(
    REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX,
    REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
    limit,
    startDate,
    endDate,
  )

  return keywordScores.map(([keyword, count]) => ({
    count: Math.round(count),
    keyword,
  }))
}

/**
 * Get popular keywords for a specific date (backward compatibility)
 * @param date - Date in ISO 8601 format (YYYY-MM-DD)
 * @param limit - Maximum number of keywords to return (default: 20)
 */
export async function getPopularKeywordsForDate(
  date: string,
  limit = 20,
): Promise<PopularKeyword[]> {
  return getPopularKeywords(date, undefined, limit)
}

/**
 * Get popular keywords for a date range (backward compatibility)
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD)
 * @param limit - Maximum number of keywords to return (default: 20)
 */
export async function getPopularKeywordsForRange(
  startDate: string,
  endDate: string,
  limit = 20,
): Promise<PopularKeyword[]> {
  return getPopularKeywords(startDate, endDate, limit)
}
