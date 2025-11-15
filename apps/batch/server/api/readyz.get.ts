import {
  checkRedisHealth,
  checkSupabaseHealth,
  createReadinessResponse,
  runHealthChecks,
} from '@shinju-date/health-checkers'

export default defineEventHandler(async () => {
  try {
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
})
