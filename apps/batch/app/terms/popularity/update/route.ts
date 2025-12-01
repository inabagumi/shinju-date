import * as Sentry from '@sentry/nextjs'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { after } from 'next/server'
import { termsPopularityUpdate as ratelimit } from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'
import { updateTermPopularity } from './_lib/update-term-popularity'

const MONITOR_SLUG = '/terms/popularity/update'

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

  const { success } = await ratelimit.limit('terms:popularity:update')

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
        value: '0 0 * * *', // Daily at midnight UTC - after all search data is collected
      },
      timezone: 'Etc/UTC',
    },
  )

  try {
    const result = await updateTermPopularity(redisClient, supabaseClient)

    Sentry.logger.info('Term popularity update completed successfully', result)

    after(async () => {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'ok',
      })

      await Sentry.flush(10_000)
    })

    return Response.json(result, {
      status: 200,
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
