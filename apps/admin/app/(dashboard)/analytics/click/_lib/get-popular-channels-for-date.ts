'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

export type PopularTalentForDate = {
  clicks: number
  id: string
  name: string
  youtube_channel: {
    youtube_channel_id: string
  } | null
}

/**
 * Get popular talents for a specific date
 */
export async function getPopularTalentsForDate(
  date: string,
  limit = 20,
): Promise<PopularTalentForDate[]> {
  try {
    const plainDate = Temporal.PlainDate.from(date)
    const zonedDate = plainDate.toZonedDateTime({
      plainTime: Temporal.PlainTime.from('00:00:00'),
      timeZone: TIME_ZONE,
    })
    const dateKey = formatDate(zonedDate)
    const key = `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${dateKey}`

    const redisClient = getRedisClient()
    const results = await redisClient.zrange<number[]>(key, 0, limit - 1, {
      rev: true,
      withScores: true,
    })

    const talentScores: [string, number][] = []
    for (let i = 0; i < results.length; i += 2) {
      const talentId = results[i]
      const score = results[i + 1]

      if (typeof talentId !== 'string' || typeof score !== 'number') {
        continue
      }

      talentScores.push([talentId, score])
    }

    if (talentScores.length === 0) {
      return []
    }

    const supabaseClient = await createSupabaseServerClient()

    const talentIds = talentScores.map(([id]) => id)
    const { data: talents, error } = await supabaseClient
      .from('channels')
      .select('id, name, youtube_channel:youtube_channels(youtube_channel_id)')
      .in('id', talentIds)

    if (error) {
      logger.error('タレントの詳細取得に失敗しました', {
        error,
        talentIds: talentIds.join(','),
      })
      return []
    }

    const talentMap = new Map(talents.map((c) => [c.id, c]))

    return talentScores
      .map(([id, clicks]) => {
        const talent = talentMap.get(id)
        if (!talent) return null

        return {
          clicks,
          id: talent.id,
          name: talent.name,
          youtube_channel: talent.youtube_channel,
        }
      })
      .filter(isNonNullable)
  } catch (error) {
    logger.error('日付別の人気タレント取得に失敗しました', {
      date,
      error,
      limit,
    })
    return []
  }
}
