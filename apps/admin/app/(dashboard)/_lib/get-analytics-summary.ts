'use server'

import { TIME_ZONE } from '@shinju-date/constants'
import {
  type AnalyticsSummary,
  collectAnalyticsSummary,
  readAnalyticsSnapshot,
  type WithTrends,
  withTrends,
} from '@shinju-date/dashboard-stats'
import { logger } from '@shinju-date/logger'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { cacheLife } from 'next/cache'
import { getRedisClient } from '@/lib/redis'

/**
 * Get the searches and clicks of today and the number of the popular
 * keywords, each with its changes from the snapshots of the day before and
 * the week before (saved by the daily job `/stats/snapshot` of batch).
 */
export async function getAnalyticsSummary(): Promise<
  WithTrends<AnalyticsSummary>
> {
  'use cache: private'

  cacheLife('minutes')

  try {
    const redisClient = getRedisClient()
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)

    const [current, yesterday, lastWeek] = await Promise.all([
      collectAnalyticsSummary(redisClient, formatDateKey(today)),
      readAnalyticsSnapshot(
        redisClient,
        formatDateKey(today.subtract({ days: 1 })),
      ),
      readAnalyticsSnapshot(
        redisClient,
        formatDateKey(today.subtract({ days: 7 })),
      ),
    ])

    return withTrends(current, yesterday, lastWeek)
  } catch (error) {
    logger.error('分析サマリーの取得に失敗しました', { error })

    // Show zeros without changes when Redis cannot be read
    return withTrends(
      { recentClicks: 0, recentSearches: 0, totalPopularKeywords: 0 },
      null,
      null,
    )
  }
}
