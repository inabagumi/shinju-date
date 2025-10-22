'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import type { Temporal } from 'temporal-polyfill'
import { createSupabaseServerClient } from '@/lib/supabase'
import { _getPopularItemsFromRedis } from './_get-popular-items-from-redis'

export type PopularChannel = {
  clicks: number
  id: number
  name: string
  slug: string
}

/**
 * Get popular channels based on click data for a date range
 * @param limit - Number of channels to return
 * @param startDate - Start date as Temporal.PlainDate
 * @param endDate - End date as Temporal.PlainDate. If undefined, gets data for single date
 */
export async function getPopularChannels(
  limit: number,
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<PopularChannel[]> {
  const channelScores = await _getPopularItemsFromRedis<number>(
    REDIS_KEYS.CLICK_CHANNEL_PREFIX,
    limit,
    startDate,
    endDate,
  )

  if (channelScores.length === 0) {
    return []
  }

  const supabaseClient = await createSupabaseServerClient()

  const channelIds = channelScores.map(([id]) => id)
  const { data: channels, error } = await supabaseClient
    .from('channels')
    .select('id, name, slug')
    .in('id', channelIds)

  if (error) {
    logger.error('チャンネルの詳細取得に失敗しました', {
      channelIds: channelIds.join(','),
      error,
    })

    return []
  }

  const channelMap = new Map(channels.map((c) => [c.id, c]))

  return channelScores
    .map(([id, clicks]) => {
      const channel = channelMap.get(id)
      if (!channel) return null

      return {
        clicks,
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
      }
    })
    .filter(isNonNullable)
}
