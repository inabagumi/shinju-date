'use server'

import { CACHE_TAGS, REDIS_KEYS } from '@shinju-date/constants'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { ActionError, type ActionResult, adminAction } from '@/lib/action'
import { createAuditLog } from '@/lib/audit-log'
import { getRedisClient } from '@/lib/redis'

async function revalidateRecommendedQueries(): Promise<void> {
  revalidatePath('/recommended-queries')
  revalidatePath('/', 'page')
  await revalidateTags([CACHE_TAGS.RECOMMENDATION_QUERIES])
}

export const addQueryAction = adminAction(
  'addQueryAction',
  async ({ supabaseClient }, query: string): Promise<ActionResult> => {
    const trimmedQuery = query?.trim()

    if (!trimmedQuery) {
      throw new ActionError('クエリを入力してください。')
    }

    await getRedisClient().sadd(
      REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED,
      trimmedQuery,
    )

    await createAuditLog(supabaseClient, 'RECOMMENDED_QUERY_CREATE', null, {
      entityName: trimmedQuery,
    })

    await revalidateRecommendedQueries()

    return { success: true }
  },
)

export const deleteQueryAction = adminAction(
  'deleteQueryAction',
  async ({ supabaseClient }, query: string): Promise<ActionResult> => {
    if (!query) {
      throw new ActionError('クエリが指定されていません。')
    }

    await getRedisClient().srem(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED, query)

    await createAuditLog(supabaseClient, 'RECOMMENDED_QUERY_DELETE', null, {
      entityName: query,
    })

    await revalidateRecommendedQueries()

    return { success: true }
  },
)
