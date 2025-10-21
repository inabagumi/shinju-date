'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { Temporal } from 'temporal-polyfill'
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
 * @param limit - Number of channels to return (default: 10)
 * @param days - Number of days (legacy parameter, ignored if startDate/endDate provided)
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD)
 */
export async function getPopularChannels(
  limit = 10,
  days = 7,
  startDate?: string,
  endDate?: string,
): Promise<PopularChannel[]> {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)

  // Determine date range
  let start: string
  let end: string | undefined

  if (startDate && endDate) {
    start = startDate
    end = endDate
  } else {
    const endPlainDate = today.toPlainDate()
    const startPlainDate = endPlainDate.subtract({ days: days - 1 })
    start = startPlainDate.toString()
    end = endPlainDate.toString()
  }

  const channelScores = await _getPopularItemsFromRedis<number>(
    REDIS_KEYS.CLICK_CHANNEL_PREFIX,
    'channels:popular:cache:',
    limit,
    start,
    end,
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

/**
 * Get popular channels for a specific date (backward compatibility)
 * @param date - Date in ISO 8601 format (YYYY-MM-DD)
 * @param limit - Maximum number of channels to return (default: 20)
 */
export async function getPopularChannelsForDate(
  date: string,
  limit = 20,
): Promise<PopularChannel[]> {
  return getPopularChannels(limit, 1, date, undefined)
}
