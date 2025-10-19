'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { timeZone } from '@/lib/constants'
import { redisClient } from '@/lib/redis'

export type DailySearchVolume = {
  count: number
  date: string
}

/**
 * Get daily search volume for the past N days
 */
export async function getSearchVolume(days = 7): Promise<DailySearchVolume[]> {
  try {
    const today = Temporal.Now.zonedDateTimeISO(timeZone)
    const volumes: DailySearchVolume[] = []

    // Get volume for each day
    for (let i = days - 1; i >= 0; i--) {
      const date = today.subtract({ days: i })
      const dateKey = formatDate(date)
      const dateStr = date.toPlainDate().toString()

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
