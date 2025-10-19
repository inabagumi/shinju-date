'use server'

import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { timeZone } from '@/lib/constants'
import { redisClient } from '@/lib/redis'

export type DailyClickVolume = {
  clicks: number
  date: string
}

/**
 * Get daily click volume for the past N days
 */
export async function getClickVolume(days = 7): Promise<DailyClickVolume[]> {
  try {
    const today = Temporal.Now.zonedDateTimeISO(timeZone)
    const volumes: DailyClickVolume[] = []

    // Get volume for each day
    for (let i = days - 1; i >= 0; i--) {
      const date = today.subtract({ days: i })
      const dateKey = formatDate(date)
      const dateStr = date.toPlainDate().toString()
      const key = `videos:clicked:${dateKey}`

      // Get the sum of all video clicks for this day
      const results = await redisClient.zrange<string[]>(key, 0, -1, {
        rev: false,
        withScores: true,
      })

      let totalClicks = 0
      for (let j = 1; j < results.length; j += 2) {
        const scoreStr = results[j]
        if (scoreStr) {
          totalClicks += Number.parseInt(scoreStr, 10)
        }
      }

      volumes.push({
        clicks: totalClicks,
        date: dateStr,
      })
    }

    return volumes
  } catch (error) {
    console.error('Failed to fetch click volume from Redis:', error)
    return []
  }
}
