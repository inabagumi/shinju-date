import * as Sentry from '@sentry/node'
import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import {
  formatDateKey,
  startOfDay,
  toDBString,
} from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getAnalyticsSummary, getSummaryStats } from '@/_lib/stats'
import { afterResponse } from '@/lib/after-response'
import { statsSnapshot as ratelimit } from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'
import { verifyCronAuth } from '@/lib/verify-cron-auth'

const MONITOR_SLUG = '/stats/snapshot'

export default defineEventHandler(async (event) => {
  // Verify cron authentication
  verifyCronAuth(event)

  const { success } = await ratelimit.limit('stats:snapshot')

  if (!success) {
    Sentry.logger.warn('There has been no interval since the last run.')

    throw createError({
      message: 'There has been no interval since the last run.',
      statusCode: 429,
    })
  }

  const checkInId = Sentry.captureCheckIn(
    {
      monitorSlug: MONITOR_SLUG,
      status: 'in_progress',
    },
    {
      schedule: {
        type: 'crontab',
        value: '10 15 * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  try {
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

    Sentry.logger.info('Statistics snapshot saved successfully', {
      analyticsSummary,
      date: targetDateKey,
      summaryStats,
    })

    afterResponse(event, async () => {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'ok',
      })

      await Sentry.flush(10_000)
    })

    setResponseStatus(event, 204)
    return null
  } catch (error) {
    afterResponse(event, async () => {
      Sentry.captureException(error)

      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'error',
      })

      await Sentry.flush(10_000)
    })

    throw createError({
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 500,
    })
  }
})
