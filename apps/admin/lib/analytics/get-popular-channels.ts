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

export type PopularChannelWithComparison = PopularChannel & {
  comparison: {
    previousClicks: number
    previousRank?: number | undefined
    currentRank: number
    clicksChangePercent: number
    rankChange?: number | undefined // positive means rank improved (lower number), negative means rank worsened
  }
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

/**
 * Add comparison data to current period channels by comparing with previous period channels
 * @param currentChannels - Channels from current period
 * @param previousChannels - Channels from previous period
 * @returns Channels with comparison data added
 */
export function addComparisonData(
  currentChannels: PopularChannel[],
  previousChannels: PopularChannel[],
): PopularChannelWithComparison[] {
  // Create a map of previous channels for easy lookup
  const previousChannelMap = new Map(
    previousChannels.map((channel, index) => [
      channel.id,
      { ...channel, rank: index + 1 },
    ]),
  )

  return currentChannels.map((channel, currentIndex) => {
    const currentRank = currentIndex + 1
    const previousData = previousChannelMap.get(channel.id)

    let comparison: PopularChannelWithComparison['comparison']

    if (previousData) {
      const clicksChangePercent =
        previousData.clicks > 0
          ? ((channel.clicks - previousData.clicks) / previousData.clicks) * 100
          : 0

      const rankChange = previousData.rank - currentRank // positive means rank improved

      comparison = {
        clicksChangePercent,
        currentRank,
        previousClicks: previousData.clicks,
        previousRank: previousData.rank,
        rankChange,
      }
    } else {
      // New entry (wasn't in previous period's top results)
      comparison = {
        clicksChangePercent: 100, // 100% increase from 0
        currentRank,
        previousClicks: 0,
        previousRank: undefined,
        rankChange: undefined,
      }
    }

    return {
      ...channel,
      comparison,
    }
  })
}
