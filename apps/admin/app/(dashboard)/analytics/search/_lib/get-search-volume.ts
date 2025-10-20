'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'

export type DailySearchVolume = {
  count: number
  date: string
}

/**
 * Get daily search volume for the past N days or a specific date range
 * @param days - Number of days (legacy parameter, ignored if startDate/endDate provided)
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD)
 */
export async function getSearchVolume(
  days = 7,
  startDate?: string,
  endDate?: string,
): Promise<DailySearchVolume[]> {
  try {
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const volumes: DailySearchVolume[] = []

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

      const count = await redisClient.get<number>(
        `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${dateKey}`,
      )

      volumes.push({
        count: count ?? 0,
        date: dateStr,
      })

      currentDate = currentDate.add({ days: 1 })
    }

    return volumes
  } catch (error) {
    console.error('Failed to fetch search volume from Redis:', error)
    return []
  }
}
