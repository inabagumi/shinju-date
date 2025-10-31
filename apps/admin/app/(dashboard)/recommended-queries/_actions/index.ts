'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit-log'
import { redisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function addQueryAction(query: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!query || query.trim() === '') {
    return { error: 'クエリを入力してください。', success: false }
  }

  const trimmedQuery = query.trim()

  try {
    await redisClient.sadd(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED, trimmedQuery)

    // Invalidate combined cache
    await redisClient.del(REDIS_KEYS.QUERIES_COMBINED_CACHE)

    // Log audit entry
    const supabaseClient = await createSupabaseServerClient()
    await createAuditLog(
      supabaseClient,
      'RECOMMENDED_QUERY_CREATE',
      trimmedQuery,
    )

    revalidatePath('/recommended-queries')
    revalidatePath('/', 'page')
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
  if (!query) {
    return { error: 'クエリが指定されていません。', success: false }
  }

  try {
    await redisClient.srem(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED, query)

    // Invalidate combined cache
    await redisClient.del(REDIS_KEYS.QUERIES_COMBINED_CACHE)

    // Log audit entry
    const supabaseClient = await createSupabaseServerClient()
    await createAuditLog(supabaseClient, 'RECOMMENDED_QUERY_DELETE', query)

    revalidatePath('/recommended-queries')
    revalidatePath('/', 'page')
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
