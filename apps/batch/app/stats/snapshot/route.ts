import * as Sentry from '@sentry/nextjs'
import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { after } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import { statsSnapshot as ratelimit } from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'

const MONITOR_SLUG = '/stats/snapshot'

export const maxDuration = 60

type SummaryStats = {
  totalVideos: number
  visibleVideos: number
  hiddenVideos: number
  deletedVideos: number
  totalTerms: number
  totalTalents: number
}

type AnalyticsSummary = {
  recentSearches: number
  totalPopularKeywords: number
  recentClicks: number
}

async function getSummaryStats(): Promise<SummaryStats> {
  // Get total video count (excluding deleted videos)
  const { count: totalVideos, error: totalError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (totalError) {
    throw new TypeError(totalError.message, {
      cause: totalError,
    })
  }

  // Get visible video count (excluding deleted videos)
  const { count: visibleVideos, error: visibleError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('visible', true)
    .is('deleted_at', null)

  if (visibleError) {
    throw new TypeError(visibleError.message, {
      cause: visibleError,
    })
  }

  // Get hidden video count (excluding deleted videos)
  const { count: hiddenVideos, error: hiddenError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('visible', false)
    .is('deleted_at', null)

  if (hiddenError) {
    throw new TypeError(hiddenError.message, {
      cause: hiddenError,
    })
  }

  // Get deleted video count
  const { count: deletedVideos, error: deletedError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .not('deleted_at', 'is', null)

  if (deletedError) {
    throw new TypeError(deletedError.message, {
      cause: deletedError,
    })
  }

  // Get total terms count
  const { count: totalTerms, error: termsError } = await supabaseClient
    .from('terms')
    .select('*', { count: 'exact', head: true })

  if (termsError) {
    throw new TypeError(termsError.message, {
      cause: termsError,
    })
  }

  // Get total talents count
  const { count: totalTalents, error: talentsError } = await supabaseClient
    .from('talents')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (talentsError) {
    throw new TypeError(talentsError.message, {
      cause: talentsError,
    })
  }

  return {
    deletedVideos: deletedVideos ?? 0,
    hiddenVideos: hiddenVideos ?? 0,
    totalTalents: totalTalents ?? 0,
    totalTerms: totalTerms ?? 0,
    totalVideos: totalVideos ?? 0,
    visibleVideos: visibleVideos ?? 0,
  }
}

async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const dateKey = formatDateKey(today)

  // Get today's search volume
  const recentSearches = await redisClient.get<number>(
    `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${dateKey}`,
  )

  // Get count of unique popular keywords
  const totalPopularKeywords = await redisClient.zcard(
    REDIS_KEYS.SEARCH_POPULAR,
  )

  // Get today's click volume
  const clickKey = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`
  const clickResults = await redisClient.zrange<string[]>(clickKey, 0, -1, {
    rev: false,
    withScores: true,
  })

  let recentClicks = 0
  for (let j = 1; j < clickResults.length; j += 2) {
    const scoreStr = clickResults[j]
    if (scoreStr) {
      recentClicks += Number.parseInt(scoreStr, 10)
    }
  }

  return {
    recentClicks,
    recentSearches: recentSearches ?? 0,
    totalPopularKeywords: totalPopularKeywords ?? 0,
  }
}

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
        value: '0 1 * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  try {
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const todayKey = formatDateKey(now)

    // Get current statistics
    const [summaryStats, analyticsSummary] = await Promise.all([
      getSummaryStats(),
      getAnalyticsSummary(),
    ])

    // Store today's snapshots in Redis (with 30 days TTL)
    await Promise.all([
      redisClient.set(
        `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${todayKey}`,
        summaryStats,
        { ex: 30 * 24 * 60 * 60 }, // 30 days
      ),
      redisClient.set(
        `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${todayKey}`,
        analyticsSummary,
        { ex: 30 * 24 * 60 * 60 }, // 30 days
      ),
    ])

    Sentry.logger.info('Statistics snapshot saved successfully', {
      analyticsSummary,
      date: todayKey,
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
