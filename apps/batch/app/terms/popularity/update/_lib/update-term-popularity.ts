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
      logger.info('Redisに検索人気度データが見つかりませんでした')
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

    logger.info('Redisから検索人気度データを取得しました', {
      count: popularityData.length,
    })

    return popularityData
  } catch (error) {
    logger.error('Redisからの検索人気度データの取得に失敗しました', { error })
    throw error
  }
}

/**
 * Update term popularity in database using upsert
 * Fetches existing terms, merges popularity data, and upserts in a single query
 */
async function updateTermsPopularityInDatabase(
  supabase: TypedSupabaseClient,
  popularityData: TermPopularity[],
): Promise<{ updated: number; notFound: number }> {
  // Fetch all existing terms with all their fields
  const { data: existingTerms, error: fetchError } = await supabase
    .from('terms')
    .select('*')

  if (fetchError) {
    logger.error('データベースから既存の用語の取得に失敗しました', {
      error: fetchError,
    })
    throw fetchError
  }

  if (!existingTerms || existingTerms.length === 0) {
    logger.info('データベースに用語が存在しません')
    return { notFound: popularityData.length, updated: 0 }
  }

  // Create a map of term (lowercase) to full term data for quick lookup
  const termMap = new Map(existingTerms.map((t) => [t.term.toLowerCase(), t]))

  // Merge popularity data with existing term data
  const termsToUpsert = popularityData
    .map((item) => {
      const existingTerm = termMap.get(item.term.toLowerCase())
      if (!existingTerm) {
        return null
      }

      // Merge existing term data with new popularity
      return {
        ...existingTerm,
        popularity: item.score,
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  const notFound = popularityData.length - termsToUpsert.length

  if (termsToUpsert.length === 0) {
    logger.info('更新対象の用語が見つかりませんでした')
    return { notFound, updated: 0 }
  }

  // Upsert all terms in a single query
  const { error: upsertError, count } = await supabase
    .from('terms')
    .upsert(termsToUpsert, {
      count: 'exact',
      onConflict: 'id',
    })

  if (upsertError) {
    logger.error('用語の人気度更新に失敗しました', {
      error: upsertError,
    })
    throw upsertError
  }

  const updated = count ?? termsToUpsert.length

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

  logger.info('用語の人気度更新が完了しました', {
    notFound: result.notFound,
    total: popularityData.length,
    updated: result.updated,
  })

  return {
    ...result,
    total: popularityData.length,
  }
}
