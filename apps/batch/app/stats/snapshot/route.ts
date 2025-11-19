import * as Sentry from '@sentry/nextjs'
import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import {
  formatDateKey,
  startOfDay,
  toDBString,
} from '@shinju-date/temporal-fns'
import { after } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import { statsSnapshot as ratelimit } from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'
import { getAnalyticsSummary, getSummaryStats } from './stats'

const MONITOR_SLUG = '/stats/snapshot'

export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  const cronSecure = process.env['CRON_SECRET']
  if (
    cronSecure &&
    !verifyCronRequest(request, {
      cronSecure,
    })
  ) {
    Sentry.logger.warn('CRON_SECRET did not match.')

    return createErrorResponse('Unauthorized', {
      status: 401,
    })
  }

  const { success } = await ratelimit.limit('stats:snapshot')

  if (!success) {
    Sentry.logger.warn('There has been no interval since the last run.')

    return createErrorResponse(
      'There has been no interval since the last run.',
      {
        status: 429,
      },
    )
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

    after(async () => {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'ok',
      })

      await Sentry.flush(10_000)
    })

    return new Response(null, {
      status: 204,
    })
  } catch (error) {
    after(async () => {
      Sentry.captureException(error)

      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'error',
      })

      await Sentry.flush(10_000)
    })

    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      {
        status: 500,
      },
    )
  }
}

export const GET = POST
