import { TIME_ZONE } from '@shinju-date/constants'
import {
  readSummarySnapshot,
  type SummaryStats,
} from '@shinju-date/dashboard-stats'
import { formatDate, formatDateKey } from '@shinju-date/temporal-fns'
import { cacheLife } from 'next/cache'
import { isNonNullable } from '@/lib/is-non-nullable'
import { getRedisClient } from '@/lib/redis'

/** The snapshot of the counts of a day, with the date to show on the chart. */
export interface HistoricalStatsEntry extends SummaryStats {
  date: string
}

/**
 * Get historical summary statistics for the past N days
 * @param days - Number of days to fetch (default: 7)
 * @returns Array of historical stats, ordered from oldest to newest. Days
 * without a snapshot are left out.
 */
export async function getHistoricalStats(
  days = 7,
): Promise<HistoricalStatsEntry[]> {
  'use cache: private'

  cacheLife('minutes')

  const redisClient = getRedisClient()
  const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)

  const entries = await Promise.all(
    Array.from({ length: days }, async (_, index) => {
      const targetDate = now.subtract({ days: days - 1 - index })
      const stats = await readSummarySnapshot(
        redisClient,
        formatDateKey(targetDate),
      )

      return (
        stats && {
          // Use the same MM/DD format as the other screens of the admin UI
          date: formatDate(targetDate, { includeYear: false }),
          ...stats,
        }
      )
    }),
  )

  return entries.filter(isNonNullable)
}
