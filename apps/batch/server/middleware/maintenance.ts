import { REDIS_KEYS } from '@shinju-date/constants'
import { redisClient } from '@/lib/redis'

export default defineEventHandler(async (event) => {
  // Allow health check endpoints during maintenance
  const pathname = event.path
  if (pathname === '/api/healthz' || pathname === '/api/readyz') {
    return
  }

  // Check for maintenance mode
  try {
    const maintenanceMode = await redisClient.get<boolean>(
      REDIS_KEYS.MAINTENANCE_MODE,
    )

    if (maintenanceMode === true) {
      // Return 503 Service Unavailable during maintenance
      throw createError({
        data: {
          error: 'Service Unavailable',
          message: 'The service is currently under maintenance.',
        },
        statusCode: 503,
        statusMessage: 'Service Unavailable',
      })
    }
  } catch (error) {
    // If the error is already a createError response, re-throw it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // If Redis is unavailable, continue normally to avoid breaking cron jobs
    console.error('Failed to check maintenance mode:', error)
  }
})
