'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { listDatesInRange } from '@/lib/analytics/list-dates-in-range'
import { getRedisClient } from '@/lib/redis'

export interface DailyClickVolume {
  clicks: number
  date: string
}

/**
 * Get daily click volume for a date range
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD)
 */
export async function getClickVolume(
  startDate: string,
  endDate: string,
): Promise<DailyClickVolume[]> {
  try {
    const redisClient = getRedisClient()
    const dates = listDatesInRange(
      Temporal.PlainDate.from(startDate),
      Temporal.PlainDate.from(endDate),
    )

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
      endDate,
      error,
      startDate,
    })
    return []
  }
}
