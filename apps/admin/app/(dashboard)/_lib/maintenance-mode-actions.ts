'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { createAuditLog } from '@/lib/audit-log'
import { redisClient } from '@/lib/redis'

export async function getMaintenanceModeStatus(): Promise<boolean> {
  try {
    const value = await redisClient.get<boolean>(REDIS_KEYS.MAINTENANCE_MODE)
    return value === true
  } catch (error) {
    console.error('Failed to get maintenance mode status:', error)
    return false
  }
}

export async function enableMaintenanceMode(): Promise<{
  success: boolean
  error?: string
}> {
  try {
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
  try {
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
