'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from '@/lib/redis'

export type SearchQualityMetrics = {
  searchEngagementRate: number
  searchExitRates: Array<{
    keyword: string
    exitRate: number
    searchCount: number
  }>
  repeatSearchRate: number
}

/**
 * Calculate search engagement rate for a single date or date range
 * @param startDate - Start date as Temporal.PlainDate
 * @param endDate - End date as Temporal.PlainDate. If undefined, gets data for single date
 */
export async function getSearchEngagementRate(
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<number> {
  try {
    const redisClient = getRedisClient()
    const start = startDate
    const end = endDate ?? startDate

    let totalSessions = 0
    let totalSearchSessions = 0

    let currentDate = start
    while (Temporal.PlainDate.compare(currentDate, end) <= 0) {
      const dateKey = formatDate(currentDate)

      // Get total sessions for this date
      const totalKey = `${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}${dateKey}`
      const searchKey = `${REDIS_KEYS.SESSIONS_WITH_SEARCH_PREFIX}${dateKey}`

      const [totalSessionsCount, searchSessionsCount] = await Promise.all([
        redisClient.scard(totalKey),
        redisClient.scard(searchKey),
      ])

      totalSessions += totalSessionsCount ?? 0
      totalSearchSessions += searchSessionsCount ?? 0

      currentDate = currentDate.add({ days: 1 })
    }

    if (totalSessions === 0) {
      return 0
    }

    return (totalSearchSessions / totalSessions) * 100
  } catch (error) {
    logger.error('検索利用率の計算に失敗しました', { error })
    return 0
  }
}

/**
 * Calculate search exit rates by keyword for a single date or date range
 * @param startDate - Start date as Temporal.PlainDate
 * @param endDate - End date as Temporal.PlainDate. If undefined, gets data for single date
 * @param limit - Maximum number of keywords to return
 */
export async function getSearchExitRates(
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
  limit = 20,
): Promise<Array<{ keyword: string; exitRate: number; searchCount: number }>> {
  try {
    const redisClient = getRedisClient()
    const start = startDate
    const end = endDate ?? startDate

    // Aggregate search counts and exit counts across the date range
    const searchCounts = new Map<string, number>()
    const exitCounts = new Map<string, number>()

    let currentDate = start
    while (Temporal.PlainDate.compare(currentDate, end) <= 0) {
      const dateKey = formatDate(currentDate)

      // Get search counts from popular searches
      const searchKey = `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${dateKey}`
      const exitKey = `${REDIS_KEYS.SEARCH_EXIT_WITHOUT_CLICK_PREFIX}${dateKey}`

      const [searchResults, exitResults] = await Promise.all([
        redisClient.zrange<string[]>(searchKey, 0, -1, { withScores: true }),
        redisClient.hgetall<Record<string, string>>(exitKey),
      ])

      // Process search counts
      for (let i = 0; i < searchResults.length; i += 2) {
        const keyword = searchResults[i]
        const count = Number(searchResults[i + 1])
        if (keyword) {
          searchCounts.set(keyword, (searchCounts.get(keyword) ?? 0) + count)
        }
      }

      // Process exit counts
      if (exitResults) {
        for (const [keyword, count] of Object.entries(exitResults)) {
          if (keyword) {
            exitCounts.set(
              keyword,
              (exitCounts.get(keyword) ?? 0) + Number(count),
            )
          }
        }
      }

      currentDate = currentDate.add({ days: 1 })
    }

    // Calculate exit rates for each keyword
    const exitRates: Array<{
      keyword: string
      exitRate: number
      searchCount: number
    }> = []

    for (const [keyword, searchCount] of searchCounts.entries()) {
      const exitCount = exitCounts.get(keyword) ?? 0
      const exitRate = searchCount > 0 ? (exitCount / searchCount) * 100 : 0

      exitRates.push({
        exitRate,
        keyword,
        searchCount,
      })
    }

    // Sort by search count (most popular first) and limit results
    return exitRates
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, limit)
  } catch (error) {
    logger.error('検索離脱率の計算に失敗しました', { error })
    return []
  }
}

/**
 * Calculate repeat search rate (average searches per session) for a single date or date range
 * @param startDate - Start date as Temporal.PlainDate
 * @param endDate - End date as Temporal.PlainDate. If undefined, gets data for single date
 */
export async function getRepeatSearchRate(
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<number> {
  try {
    const redisClient = getRedisClient()
    const start = startDate
    const end = endDate ?? startDate

    let totalSearches = 0
    let totalSessions = 0

    let currentDate = start
    while (Temporal.PlainDate.compare(currentDate, end) <= 0) {
      const dateKey = formatDate(currentDate)

      // Get search sessions data
      const sessionKey = `${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}${dateKey}`
      const sessionData =
        await redisClient.hgetall<Record<string, string>>(sessionKey)

      if (sessionData) {
        for (const searchCount of Object.values(sessionData)) {
          const count = Number(searchCount)
          totalSearches += count
          totalSessions += 1
        }
      }

      currentDate = currentDate.add({ days: 1 })
    }

    if (totalSessions === 0) {
      return 0
    }

    return totalSearches / totalSessions
  } catch (error) {
    logger.error('リピート検索率の計算に失敗しました', { error })
    return 0
  }
}

/**
 * Get all search quality metrics for a date range
 */
export async function getSearchQualityMetrics(
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<SearchQualityMetrics> {
  const [searchEngagementRate, searchExitRates, repeatSearchRate] =
    await Promise.all([
      getSearchEngagementRate(startDate, endDate),
      getSearchExitRates(startDate, endDate),
      getRepeatSearchRate(startDate, endDate),
    ])

  return {
    repeatSearchRate,
    searchEngagementRate,
    searchExitRates,
  }
}
