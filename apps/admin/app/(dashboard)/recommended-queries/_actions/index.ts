'use server'

import { CACHE_TAGS, REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'
import { getRedisClient } from '@/lib/redis'

export async function addQueryAction(query: string): Promise<{
  success: boolean
  error?: string
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  if (!query || query.trim() === '') {
    return { error: 'クエリを入力してください。', success: false }
  }

  const trimmedQuery = query.trim()

  try {
    const redisClient = getRedisClient()
    await redisClient.sadd(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED, trimmedQuery)

    // Log audit entry
    await createAuditLog(
      auth.supabaseClient,
      'RECOMMENDED_QUERY_CREATE',
      null,
      {
        entityName: trimmedQuery,
      },
    )

    revalidatePath('/recommended-queries')
    revalidatePath('/', 'page')
    await revalidateTags([CACHE_TAGS.RECOMMENDATION_QUERIES])
    return { success: true }
  } catch (error) {
    logger.error('クエリの追加に失敗しました', { error, query: trimmedQuery })
    return {
      error:
        error instanceof Error ? error.message : 'クエリの追加に失敗しました。',
      success: false,
    }
  }
}

export async function deleteQueryAction(query: string): Promise<{
  success: boolean
  error?: string
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  if (!query) {
    return { error: 'クエリが指定されていません。', success: false }
  }

  try {
    const redisClient = getRedisClient()
    await redisClient.srem(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED, query)

    // Log audit entry
    await createAuditLog(
      auth.supabaseClient,
      'RECOMMENDED_QUERY_DELETE',
      null,
      {
        entityName: query,
      },
    )

    revalidatePath('/recommended-queries')
    revalidatePath('/', 'page')
    await revalidateTags([CACHE_TAGS.RECOMMENDATION_QUERIES])
    return { success: true }
  } catch (error) {
    logger.error('クエリの削除に失敗しました', { error, query })
    return {
      error:
        error instanceof Error ? error.message : 'クエリの削除に失敗しました。',
      success: false,
    }
  }
}
