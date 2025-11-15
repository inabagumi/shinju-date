import * as Sentry from '@sentry/node'
import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey, getMondayOfWeek } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { afterResponse } from '@/lib/after-response'
import { recommendationQueriesUpdate as ratelimit } from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'
import { verifyCronAuth } from '@/lib/verify-cron-auth'

const MONITOR_SLUG = '/recommendation/queries/update'

// Weights for different time periods
const WEIGHT_DAILY = 10.0
const WEIGHT_WEEKLY = 5.0
const WEIGHT_ALL_TIME = 1.0

async function getAllTerms({
  page = 1,
  perPage = 1_000,
}: {
  perPage?: number
  page?: number
} = {}) {
  const { data: terms, error } = await supabaseClient
    .from('terms')
    .select('term, synonyms')
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

export default defineEventHandler(async (event) => {
  // Verify cron authentication
  verifyCronAuth(event)

  const { success } = await ratelimit.limit('recommendation:queries:update')

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
        value: '17 1 * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  try {
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const today = formatDateKey(now)
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
    }

    // Perform ZUNIONSTORE with weights
    await redisClient.zunionstore(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
      keysToUnion.length,
      [...keysToUnion, 'WEIGHTS', ...weights.map(String)],
    )

    // Get all members with their scores from the union
    const weightedQueries = await redisClient.zrange(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
      0,
      -1,
      {
        withScores: true,
      },
    )

    // Parse the results (format: [member, score, member, score, ...])
    const queriesWithScores: Array<{ query: string; score: number }> = []
    for (let i = 0; i < weightedQueries.length; i += 2) {
      const query = String(weightedQueries[i])
      const score = Number(weightedQueries[i + 1])
      queriesWithScores.push({ query, score })
    }

    // Get all terms from the database
    const terms = await getAllTerms()

    // Build a map from all terms/synonyms (lowercase) to their canonical term
    const termMap = new Map<string, string>()
    for (const { term, synonyms } of terms) {
      const lowerTerm = term.toLowerCase()
      // Map the term to itself
      termMap.set(lowerTerm, term)
      // Map all synonyms to the main term
      for (const synonym of synonyms) {
        termMap.set(synonym.toLowerCase(), term)
      }
    }

    // Filter queries that match terms or synonyms, and map to canonical term
    const matchingQueriesMap = new Map<string, number>()
    for (const { query, score } of queriesWithScores) {
      const canonicalTerm = termMap.get(query.toLowerCase())
      if (canonicalTerm) {
        // If this canonical term is already in the map, use the higher score
        const existingScore = matchingQueriesMap.get(canonicalTerm) ?? 0
        if (score > existingScore) {
          matchingQueriesMap.set(canonicalTerm, score)
        }
      }
    }

    // Convert map to array and sort by score descending
    const matchingQueries = Array.from(matchingQueriesMap.entries()).map(
      ([query, score]) => ({ query, score }),
    )
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
    multi.del(REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION)

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

    afterResponse(event, async () => {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'error',
      })

      await Sentry.flush(10_000)
    })

    throw error
  }

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
})
