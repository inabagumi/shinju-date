'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { revalidatePath } from 'next/cache'
import { redisClient } from '@/lib/redis'

export async function addQueryAction(query: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!query || query.trim() === '') {
    return { error: 'クエリを入力してください。', success: false }
  }

  const trimmedQuery = query.trim()

  try {
    await redisClient.sadd(REDIS_KEYS.RECOMMENDATION_QUERIES, trimmedQuery)

    revalidatePath('/recommended-queries')
    revalidatePath('/', 'page')
    return { success: true }
  } catch (error) {
    console.error('Add query error:', error)
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
    await redisClient.srem(REDIS_KEYS.RECOMMENDATION_QUERIES, query)

    revalidatePath('/recommended-queries')
    revalidatePath('/', 'page')
    return { success: true }
  } catch (error) {
    console.error('Delete query error:', error)
    return {
      error:
        error instanceof Error ? error.message : 'クエリの削除に失敗しました。',
      success: false,
    }
  }
}
