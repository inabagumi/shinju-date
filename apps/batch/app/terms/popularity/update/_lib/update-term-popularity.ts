import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import type { Redis } from '@upstash/redis'
import type { TypedSupabaseClient } from '@/lib/supabase'

interface TermPopularity {
  term: string
  score: number
}

/**
 * Fetch search popularity data from Redis
 * Uses the all-time search popularity sorted set
 */
async function fetchSearchPopularityFromRedis(
  redis: Redis,
): Promise<TermPopularity[]> {
  try {
    // Fetch all terms from the all-time popularity sorted set
    // withScores: true returns a flat array [member1, score1, member2, score2, ...]
    const results = await redis.zrange<(string | number)[]>(
      REDIS_KEYS.SEARCH_POPULAR_ALL_TIME,
      0,
      -1,
      {
        withScores: true,
      },
    )

    if (!results || results.length === 0) {
      logger.info('No search popularity data found in Redis')
      return []
    }

    // Convert flat array to array of objects with term and score
    const popularityData: TermPopularity[] = []
    for (let i = 0; i < results.length; i += 2) {
      const term = results[i]
      const score = results[i + 1]

      if (typeof term === 'string' && typeof score === 'number') {
        popularityData.push({
          score: Math.floor(score), // Ensure integer
          term,
        })
      }
    }

    logger.info('Fetched search popularity data from Redis', {
      count: popularityData.length,
    })

    return popularityData
  } catch (error) {
    logger.error('Failed to fetch search popularity from Redis', { error })
    throw error
  }
}

/**
 * Update term popularity in database
 * Matches Redis search terms with database terms and updates popularity
 */
async function updateTermsPopularityInDatabase(
  supabase: TypedSupabaseClient,
  popularityData: TermPopularity[],
): Promise<{ updated: number; notFound: number }> {
  let updated = 0
  let notFound = 0

  // Process terms in batches to avoid overwhelming the database
  const BATCH_SIZE = 100
  for (let i = 0; i < popularityData.length; i += BATCH_SIZE) {
    const batch = popularityData.slice(i, i + BATCH_SIZE)

    // Update each term in the batch
    for (const { term, score } of batch) {
      try {
        const { data, error } = await supabase
          .from('terms')
          .update({ popularity: score })
          .eq('term', term)
          .select('id')

        if (error) {
          logger.error('Failed to update term popularity', {
            error,
            term,
          })
          continue
        }

        if (data && data.length > 0) {
          updated++
        } else {
          notFound++
        }
      } catch (error) {
        logger.error('Error updating term popularity', {
          error,
          term,
        })
      }
    }
  }

  return { notFound, updated }
}

/**
 * Main function to update term popularity from Redis to database
 */
export async function updateTermPopularity(
  redis: Redis,
  supabase: TypedSupabaseClient,
): Promise<{ updated: number; notFound: number; total: number }> {
  // Fetch popularity data from Redis
  const popularityData = await fetchSearchPopularityFromRedis(redis)

  if (popularityData.length === 0) {
    return { notFound: 0, total: 0, updated: 0 }
  }

  // Update database
  const result = await updateTermsPopularityInDatabase(supabase, popularityData)

  logger.info('Term popularity update completed', {
    notFound: result.notFound,
    total: popularityData.length,
    updated: result.updated,
  })

  return {
    ...result,
    total: popularityData.length,
  }
}
