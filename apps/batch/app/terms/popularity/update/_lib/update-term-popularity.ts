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
 * Update term popularity in database using batch updates with Promise.all
 * Matches Redis search terms with database terms and updates popularity
 */
async function updateTermsPopularityInDatabase(
  supabase: TypedSupabaseClient,
  popularityData: TermPopularity[],
): Promise<{ updated: number; notFound: number }> {
  // Get all existing terms from the database to determine which ones exist
  const { data: existingTerms, error: fetchError } = await supabase
    .from('terms')
    .select('term')

  if (fetchError) {
    logger.error('データベースから既存の用語の取得に失敗しました', {
      error: fetchError,
    })
    throw fetchError
  }

  const existingTermSet = new Set(
    existingTerms?.map((t) => t.term.toLowerCase()) ?? [],
  )

  // Filter to only update terms that exist in the database
  const termsToUpdate = popularityData.filter((item) =>
    existingTermSet.has(item.term.toLowerCase()),
  )
  const notFound = popularityData.length - termsToUpdate.length

  if (termsToUpdate.length === 0) {
    logger.info('更新対象の用語が見つかりませんでした')
    return { notFound, updated: 0 }
  }

  // Process in batches to avoid overwhelming the database
  // Use Promise.all to execute updates in parallel within each batch
  const BATCH_SIZE = 100
  let updated = 0

  for (let i = 0; i < termsToUpdate.length; i += BATCH_SIZE) {
    const batch = termsToUpdate.slice(i, i + BATCH_SIZE)

    try {
      // Execute all updates in the batch in parallel using Promise.allSettled
      const results = await Promise.allSettled(
        batch.map(async ({ term, score }) => {
          const { data, error } = await supabase
            .from('terms')
            .update({ popularity: score })
            .eq('term', term)
            .select('id')

          if (error) {
            logger.error('用語の人気度更新に失敗しました', {
              error,
              term,
            })
            throw error
          }

          return data && data.length > 0
        }),
      )

      // Count successful updates
      const successfulUpdates = results.filter(
        (result) => result.status === 'fulfilled' && result.value === true,
      ).length

      updated += successfulUpdates
    } catch (error) {
      logger.error('用語の人気度更新中にエラーが発生しました（バッチ処理）', {
        batchSize: batch.length,
        error,
        startIndex: i,
      })
      // Continue with next batch even if this one fails
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
