'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'
import { getRedisClient } from '@/lib/redis'

export async function enableMaintenanceMode(): Promise<{
  success: boolean
  error?: string
}> {
  if (!(await requireAuthenticatedUser())) {
    return unauthenticatedResult()
  }

  try {
    const redisClient = getRedisClient()
    // Set maintenance mode in Redis
    await redisClient.set(REDIS_KEYS.MAINTENANCE_MODE, 'true')

    // Log audit event
    await createAuditLog('MAINTENANCE_MODE_ENABLE', 'redis:system')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to enable maintenance mode:', error)
    return {
      error: 'メンテナンスモードの有効化に失敗しました。',
      success: false,
    }
  }
}

export async function disableMaintenanceMode(): Promise<{
  success: boolean
  error?: string
}> {
  if (!(await requireAuthenticatedUser())) {
    return unauthenticatedResult()
  }

  try {
    const redisClient = getRedisClient()
    // Delete maintenance mode key from Redis
    await redisClient.del(REDIS_KEYS.MAINTENANCE_MODE)

    // Log audit event
    await createAuditLog('MAINTENANCE_MODE_DISABLE', 'redis:system')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to disable maintenance mode:', error)
    return {
      error: 'メンテナンスモードの無効化に失敗しました。',
      success: false,
    }
  }
}
