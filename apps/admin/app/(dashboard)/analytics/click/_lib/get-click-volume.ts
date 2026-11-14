'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { listDatesInRange } from '@/lib/analytics/list-dates-in-range'
import { getRedisClient } from '@/lib/redis'

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
    const redisClient = getRedisClient()
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)

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

    const dates = listDatesInRange(start, end)

    if (dates.length === 0) {
      return []
    }

    // Fetch every day in a single request instead of one round trip per day
    const pipeline = redisClient.pipeline()
    for (const date of dates) {
      pipeline.zrange(
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${formatDateKey(date)}`,
        0,
        -1,
        {
          rev: false,
          withScores: true,
        },
      )
    }
    const results = await pipeline.exec<string[][]>()

    const volumes = dates.map((date, index): DailyClickVolume => {
      const members = results[index] ?? []

      // Get the sum of all video clicks for this day
      let totalClicks = 0
      for (let j = 1; j < members.length; j += 2) {
        const scoreStr = members[j]
        if (scoreStr) {
          totalClicks += Number.parseInt(scoreStr, 10)
        }
      }

      return {
        clicks: totalClicks,
        date: date.toString(),
      }
    })

    return volumes
  } catch (error) {
    logger.error('Redisからクリックボリュームの取得に失敗しました', {
      days,
      endDate: endDate ?? 'undefined',
      error,
      startDate: startDate ?? 'undefined',
    })
    return []
  }
}
