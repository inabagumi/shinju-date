import {
  checkRedisHealth,
  checkSupabaseHealth,
  createReadinessResponse,
  runHealthChecks,
} from '@shinju-date/health-checkers'
import { getRedisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(): Promise<Response> {
  try {
    const supabaseClient = await createSupabaseServerClient()
    const redisClient = getRedisClient()

    const { status, results } = await runHealthChecks([
      () => checkSupabaseHealth(supabaseClient),
      () => checkRedisHealth(redisClient),
    ])

    return createReadinessResponse(status, results)
  } catch (error) {
    return createReadinessResponse('error', undefined, {
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'Health check failed',
    })
  }
}
