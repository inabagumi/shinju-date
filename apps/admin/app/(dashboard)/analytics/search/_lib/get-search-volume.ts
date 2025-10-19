'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { redisClient } from '@/lib/redis'

export type DailySearchVolume = {
  date: string
  count: number
}

/**
 * Get daily search volume for the past N days
 */
export async function getSearchVolume(days = 7): Promise<DailySearchVolume[]> {
  try {
    const today = new Date()
    const volumes: DailySearchVolume[] = []

    // Get volume for each day
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      const dateKey = dateStr.replace(/-/g, '')

      const count = await redisClient.get<number>(
        `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${dateKey}`,
      )

      volumes.push({
        count: count ?? 0,
        date: dateStr,
      })
    }

    return volumes
  } catch (error) {
    console.error('Failed to fetch search volume from Redis:', error)
    return []
  }
}
