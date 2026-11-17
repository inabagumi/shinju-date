'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { cacheLife } from 'next/cache'
import { getRedisClient } from '@/lib/redis'
import { listDatesInRange } from './list-dates-in-range'
import { dailyKeys, parseScoredMembers } from './redis'

/**
 * Calculate search engagement rate for a single date or date range
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD). If undefined, gets data for single date
 * @returns The rate in percent, or `null` when there is no session to
 * measure it against (or it could not be calculated)
 */
export async function getSearchEngagementRate(
  startDate: string,
  endDate?: string,
): Promise<number | null> {
  'use cache: private'

  cacheLife('minutes')

  try {
    const redisClient = getRedisClient()
    const start = Temporal.PlainDate.from(startDate)
    const end = endDate ? Temporal.PlainDate.from(endDate) : start

    const dates = listDatesInRange(start, end)

    if (dates.length === 0) {
      return null
    }

    // Fetch every day in a single request instead of one round trip per day.
    // Each day queues two commands: total sessions, then sessions with search.
    const pipeline = redisClient.pipeline()
    for (const date of dates) {
      const dateKey = formatDateKey(date)

      pipeline.scard(`${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}${dateKey}`)
      pipeline.scard(`${REDIS_KEYS.SESSIONS_WITH_SEARCH_PREFIX}${dateKey}`)
    }
    const counts = await pipeline.exec<(number | null)[]>()

    let totalSessions = 0
    let totalSearchSessions = 0

    for (let i = 0; i < counts.length; i += 2) {
      totalSessions += counts[i] ?? 0
      totalSearchSessions += counts[i + 1] ?? 0
    }

    if (totalSessions === 0) {
      return null
    }

    return (totalSearchSessions / totalSessions) * 100
  } catch (error) {
    logger.error('検索利用率の計算に失敗しました', { error })
    return null
  }
}

/**
 * Calculate search exit rates by keyword for a single date or date range
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD). If undefined, gets data for single date
 * @param limit - Maximum number of keywords to return
 */
export async function getSearchExitRates(
  startDate: string,
  endDate?: string,
  limit = 20,
): Promise<Array<{ keyword: string; exitRate: number; searchCount: number }>> {
  'use cache: private'

  cacheLife('minutes')

  try {
    const redisClient = getRedisClient()
    const start = Temporal.PlainDate.from(startDate)
    const end = endDate ? Temporal.PlainDate.from(endDate) : start

    // Aggregate search counts and exit counts across the date range
    const searchCounts = new Map<string, number>()
    const exitCounts = new Map<string, number>()

    const range = { end, start }
    const searchKeys = dailyKeys(REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX, range)
    const exitKeys = dailyKeys(
      REDIS_KEYS.SEARCH_EXIT_WITHOUT_CLICK_PREFIX,
      range,
    )

    if (searchKeys.length === 0) {
      return []
    }

    // Fetch every day with one pipeline per data type (two requests in
    // parallel) instead of one round trip per day
    const searchPipeline = redisClient.pipeline()
    const exitPipeline = redisClient.pipeline()
    for (const key of searchKeys) {
      // Get search counts from popular searches
      searchPipeline.zrange(key, 0, -1, { withScores: true })
    }
    for (const key of exitKeys) {
      exitPipeline.hgetall(key)
    }
    const [dailySearchResults, dailyExitResults] = await Promise.all([
      searchPipeline.exec<unknown[][]>(),
      exitPipeline.exec<(Record<string, string> | null)[]>(),
    ])

    for (const [index, searchResults] of dailySearchResults.entries()) {
      const exitResults = dailyExitResults[index]

      // Process search counts
      for (const { member: keyword, score: count } of parseScoredMembers(
        searchResults,
      )) {
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
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD). If undefined, gets data for single date
 * @returns The average number of searches per session, or `null` when there
 * is no search session to measure it against (or it could not be calculated)
 */
export async function getRepeatSearchRate(
  startDate: string,
  endDate?: string,
): Promise<number | null> {
  'use cache: private'

  cacheLife('minutes')

  try {
    const redisClient = getRedisClient()
    const start = Temporal.PlainDate.from(startDate)
    const end = endDate ? Temporal.PlainDate.from(endDate) : start

    const dates = listDatesInRange(start, end)

    if (dates.length === 0) {
      return null
    }

    // Fetch every day in a single request instead of one round trip per day
    const pipeline = redisClient.pipeline()
    for (const date of dates) {
      // Get search sessions data
      pipeline.hgetall(
        `${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}${formatDateKey(date)}`,
      )
    }
    const dailySessionData =
      await pipeline.exec<(Record<string, string> | null)[]>()

    let totalSearches = 0
    let totalSessions = 0

    for (const sessionData of dailySessionData) {
      if (sessionData) {
        for (const searchCount of Object.values(sessionData)) {
          const count = Number(searchCount)
          totalSearches += count
          totalSessions += 1
        }
      }
    }

    if (totalSessions === 0) {
      return null
    }

    return totalSearches / totalSessions
  } catch (error) {
    logger.error('リピート検索率の計算に失敗しました', { error })
    return null
  }
}
