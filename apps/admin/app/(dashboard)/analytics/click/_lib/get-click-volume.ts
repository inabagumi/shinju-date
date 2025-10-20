'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'

export type DailyClickVolume = {
  clicks: number
  date: string
}

/**
 * Get daily click volume for the past N days or a specific date range
 * @param days - Number of days (legacy parameter, ignored if startDate/endDate provided)
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD)
 */
export async function getClickVolume(
  days = 7,
  startDate?: string,
  endDate?: string,
): Promise<DailyClickVolume[]> {
  try {
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const volumes: DailyClickVolume[] = []

    // Determine date range
    let start: Temporal.PlainDate
    let end: Temporal.PlainDate

    if (startDate && endDate) {
      start = Temporal.PlainDate.from(startDate)
      end = Temporal.PlainDate.from(endDate)
    } else {
      end = today.toPlainDate()
      start = end.subtract({ days: days - 1 })
    }

    // Get volume for each day in the range
    let currentDate = start
    while (Temporal.PlainDate.compare(currentDate, end) <= 0) {
      const zonedDate = currentDate.toZonedDateTime({
        plainTime: Temporal.PlainTime.from('00:00:00'),
        timeZone: TIME_ZONE,
      })
      const dateKey = formatDate(zonedDate)
      const dateStr = currentDate.toString()
      const key = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`

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

      currentDate = currentDate.add({ days: 1 })
    }

    return volumes
  } catch (error) {
    console.error('Failed to fetch click volume from Redis:', error)
    return []
  }
}
