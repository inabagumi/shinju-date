import { REDIS_KEYS } from '@shinju-date/constants'
import { getRedisClient } from '@/lib/redis'

export async function getMaintenanceModeStatus(): Promise<boolean> {
  try {
    const redisClient = getRedisClient()
    const value = await redisClient.get<boolean>(REDIS_KEYS.MAINTENANCE_MODE)
    return value === true
  } catch (error) {
    console.error('Failed to get maintenance mode status:', error)
    return false
  }
}
