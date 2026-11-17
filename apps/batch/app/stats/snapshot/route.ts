import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import {
  formatDateKey,
  startOfDay,
  toDBString,
} from '@shinju-date/temporal-fns'
import { runCronJob } from '@/lib/cron'
import { STATS_SNAPSHOT_JOB } from '@/lib/jobs'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'
import { getAnalyticsSummary, getSummaryStats } from './_lib/stats'

export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  return runCronJob(request, STATS_SNAPSHOT_JOB, async () => {
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    // Calculate previous day
    const previousDay = now.subtract({ days: 1 })
    const previousDayStart = startOfDay(previousDay)

    // Format for database queries (use the start of the next day for lt comparison)
    const targetDayEnd = toDBString(previousDayStart.add({ days: 1 }))
    const targetDateKey = formatDateKey(previousDay)

    // Get previous day's statistics
    const [summaryStats, analyticsSummary] = await Promise.all([
      getSummaryStats(supabaseClient, targetDayEnd),
      getAnalyticsSummary(redisClient, targetDateKey),
    ])

    // Store previous day's snapshots in Redis (with 30 days TTL)
    await Promise.all([
      redisClient.set(
        `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${targetDateKey}`,
        summaryStats,
        { ex: 30 * 24 * 60 * 60 }, // 30 days
      ),
      redisClient.set(
        `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${targetDateKey}`,
        analyticsSummary,
        { ex: 30 * 24 * 60 * 60 }, // 30 days
      ),
    ])

    logger.info('統計のスナップショットを保存しました', {
      analyticsSummary,
      date: targetDateKey,
      summaryStats,
    })
  })
}

export const GET = POST
