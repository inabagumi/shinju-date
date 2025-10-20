import * as Sentry from '@sentry/nextjs'
import { REDIS_KEYS } from '@shinju-date/constants'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { formatDate } from '@shinju-date/temporal-fns'
import { after, type NextRequest } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import { recommendationQueriesUpdate as ratelimit } from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'

const MONITOR_SLUG = '/recommendation/queries/update'
const TIME_ZONE = 'Asia/Tokyo'
const TEMP_UNION_KEY = 'search:popular:temp_union'

// Weights for different time periods
const WEIGHT_DAILY = 10.0
const WEIGHT_WEEKLY = 5.0
const WEIGHT_ALL_TIME = 1.0

export const runtime = 'nodejs'
export const revalidate = 0
export const maxDuration = 120

/**
 * Get the Monday of the week for a given date
 */
function getMondayOfWeek(dateTime: Temporal.ZonedDateTime): string {
  const dayOfWeek = dateTime.dayOfWeek // 1 = Monday, 7 = Sunday
  const daysToSubtract = dayOfWeek - 1
  const monday = dateTime.subtract({ days: daysToSubtract })
  return formatDate(monday)
}

async function getAllTerms({
  page = 1,
  perPage = 1_000,
}: {
  perPage?: number
  page?: number
} = {}) {
  const { data: terms, error } = await supabaseClient
    .from('terms')
    .select('term')
    .order('updated_at', {
      ascending: true,
    })
    .range((page - 1) * perPage, perPage * page - 1)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  if (terms.length === perPage) {
    const nextTerms = await getAllTerms({
      page: page + 1,
      perPage,
    })

    terms.push(...nextTerms)
  }

  return terms
}

export async function POST(request: NextRequest) {
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

  const { success } = await ratelimit.limit('recommendation:queries:update')

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
        value: '17 1 * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  try {
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const today = formatDate(now)
    const mondayOfWeek = getMondayOfWeek(now)

    const dailyKey = `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${today}`
    const weeklyKey = `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}${mondayOfWeek}`
    const allTimeKey = REDIS_KEYS.SEARCH_POPULAR_ALL_TIME

    // Get all keys to check if they exist
    const [dailyExists, weeklyExists, allTimeExists] = await Promise.all([
      redisClient.exists(dailyKey),
      redisClient.exists(weeklyKey),
      redisClient.exists(allTimeKey),
    ])

    // Build the list of keys and weights for ZUNIONSTORE
    const keysToUnion: string[] = []
    const weights: number[] = []

    if (dailyExists) {
      keysToUnion.push(dailyKey)
      weights.push(WEIGHT_DAILY)
    }
    if (weeklyExists) {
      keysToUnion.push(weeklyKey)
      weights.push(WEIGHT_WEEKLY)
    }
    if (allTimeExists) {
      keysToUnion.push(allTimeKey)
      weights.push(WEIGHT_ALL_TIME)
    }

    if (keysToUnion.length === 0) {
      Sentry.logger.info(
        'No search data available to generate recommendations.',
      )

      // Clear the auto_recommended key if no data available
      await redisClient.del(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED)

      // Invalidate combined cache
      await redisClient.del(REDIS_KEYS.QUERIES_COMBINED_CACHE)

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
    }

    // Perform ZUNIONSTORE with weights
    await redisClient.zunionstore(TEMP_UNION_KEY, keysToUnion.length, [
      ...keysToUnion,
      'WEIGHTS',
      ...weights.map(String),
    ])

    // Get all members with their scores from the union
    const weightedQueries = await redisClient.zrange(TEMP_UNION_KEY, 0, -1, {
      withScores: true,
    })

    // Parse the results (format: [member, score, member, score, ...])
    const queriesWithScores: Array<{ query: string; score: number }> = []
    for (let i = 0; i < weightedQueries.length; i += 2) {
      const query = String(weightedQueries[i])
      const score = Number(weightedQueries[i + 1])
      queriesWithScores.push({ query, score })
    }

    // Get all terms from the database
    const terms = await getAllTerms()
    const termSet = new Set(terms.map(({ term }) => term.toLowerCase()))

    // Filter queries that match terms exactly
    const matchingQueries = queriesWithScores.filter(({ query }) =>
      termSet.has(query.toLowerCase()),
    )

    // Sort by score descending
    matchingQueries.sort((a, b) => b.score - a.score)

    // Delete old auto_recommended ZSET and create new one
    const multi = redisClient.multi()
    multi.del(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED)

    if (matchingQueries.length > 0) {
      // Add all matching queries with their scores
      for (const { query, score } of matchingQueries) {
        multi.zadd(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED, {
          member: query,
          score,
        })
      }
    }

    // Delete temporary union key
    multi.del(TEMP_UNION_KEY)

    // Invalidate combined cache
    multi.del(REDIS_KEYS.QUERIES_COMBINED_CACHE)

    await multi.exec()

    Sentry.logger.info('Updated auto-recommended queries.', {
      count: matchingQueries.length,
      topQueries: matchingQueries.slice(0, 10).map(({ query, score }) => ({
        query,
        score,
      })),
    })
  } catch (error) {
    Sentry.logger.error('Failed to update auto-recommended queries.', {
      error,
    })

    after(async () => {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'error',
      })

      await Sentry.flush(10_000)
    })

    throw error
  }

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
}

export const GET = POST
