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
  comparison?: {
    previousClicks: number
    previousRank?: number | undefined
    currentRank: number
    clicksChangePercent: number
    rankChange?: number | undefined // positive means rank improved (lower number), negative means rank worsened
  }
}

export type PopularChannelWithComparison = {
  clicks: number
  id: number
  name: string
  slug: string
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
 * Get popular channels with comparison data against previous period
 * @param limit - Number of channels to return
 * @param startDate - Start date as Temporal.PlainDate
 * @param endDate - End date as Temporal.PlainDate. If undefined, gets data for single date
 */
export async function getPopularChannelsWithComparison(
  limit: number,
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<PopularChannelWithComparison[]> {
  const end = endDate ?? startDate
  const duration = end.since(startDate).days + 1

  // Calculate previous period dates
  const previousEnd = startDate.subtract({ days: 1 })
  const previousStart = previousEnd.subtract({ days: duration - 1 })

  // Fetch current and previous period data
  const [currentChannelScores, previousChannelScores] = await Promise.all([
    _getPopularItemsFromRedis<number>(
      REDIS_KEYS.CLICK_CHANNEL_PREFIX,
      limit * 2, // Get more results to account for changes in ranking
      startDate,
      endDate,
    ),
    _getPopularItemsFromRedis<number>(
      REDIS_KEYS.CLICK_CHANNEL_PREFIX,
      limit * 2,
      previousStart,
      previousEnd,
    ),
  ])

  if (currentChannelScores.length === 0) {
    return []
  }

  const supabaseClient = await createSupabaseServerClient()

  // Get all unique channel IDs from both periods
  const allChannelIds = Array.from(
    new Set([
      ...currentChannelScores.map(([id]) => id),
      ...previousChannelScores.map(([id]) => id),
    ]),
  )

  const { data: channels, error } = await supabaseClient
    .from('channels')
    .select('id, name, slug')
    .in('id', allChannelIds)

  if (error) {
    logger.error('チャンネルの詳細取得に失敗しました', {
      channelIds: allChannelIds.join(','),
      error,
    })

    return []
  }

  const channelMap = new Map(channels.map((c) => [c.id, c]))

  // Create maps for easy lookup
  const previousChannelMap = new Map(
    previousChannelScores.map(([id, clicks], index) => [
      id,
      { clicks, rank: index + 1 },
    ]),
  )

  return currentChannelScores
    .slice(0, limit) // Only take the top results for current period
    .map(([id, clicks], currentIndex) => {
      const channel = channelMap.get(id)
      if (!channel) return null

      const currentRank = currentIndex + 1
      const previousData = previousChannelMap.get(id)

      let comparison: PopularChannelWithComparison['comparison']

      if (previousData) {
        const clicksChangePercent =
          previousData.clicks > 0
            ? ((clicks - previousData.clicks) / previousData.clicks) * 100
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
        clicks,
        comparison,
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
      }
    })
    .filter(isNonNullable)
}
