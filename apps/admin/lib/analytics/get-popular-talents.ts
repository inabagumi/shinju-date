'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import type { Temporal } from 'temporal-polyfill'
import { createSupabaseServerClient } from '@/lib/supabase'
import { _getPopularItemsFromRedis } from './_get-popular-items-from-redis'

export type PopularTalent = {
  clicks: number
  id: string
  name: string
  youtube_channel: {
    youtube_channel_id: string
  } | null
}

/**
 * Get popular talents based on click data for a date range
 * @param limit - Number of talents to return
 * @param startDate - Start date as Temporal.PlainDate
 * @param endDate - End date as Temporal.PlainDate. If undefined, gets data for single date
 */
export async function getPopularTalents(
  limit: number,
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<PopularTalent[]> {
  const talentScores = await _getPopularItemsFromRedis<string>(
    REDIS_KEYS.CLICK_CHANNEL_PREFIX,
    limit,
    startDate,
    endDate,
  )

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
}
