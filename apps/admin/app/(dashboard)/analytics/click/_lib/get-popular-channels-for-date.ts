'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

export type PopularChannelForDate = {
  clicks: number
  id: string
  name: string
  slug: string
  youtube_channel: {
    youtube_channel_id: string
  } | null
}

/**
 * Get popular channels for a specific date
 */
export async function getPopularChannelsForDate(
  date: string,
  limit = 20,
): Promise<PopularChannelForDate[]> {
  try {
    const plainDate = Temporal.PlainDate.from(date)
    const zonedDate = plainDate.toZonedDateTime({
      plainTime: Temporal.PlainTime.from('00:00:00'),
      timeZone: TIME_ZONE,
    })
    const dateKey = formatDate(zonedDate)
    const key = `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${dateKey}`

    const results = await redisClient.zrange<number[]>(key, 0, limit - 1, {
      rev: true,
      withScores: true,
    })

    const channelScores: [string, number][] = []
    for (let i = 0; i < results.length; i += 2) {
      const channelId = results[i]
      const score = results[i + 1]

      if (typeof channelId !== 'string' || typeof score !== 'number') {
        continue
      }

      channelScores.push([channelId, score])
    }

    if (channelScores.length === 0) {
      return []
    }

    const supabaseClient = await createSupabaseServerClient()

    const channelIds = channelScores.map(([id]) => id)
    const { data: channels, error } = await supabaseClient
      .from('channels')
      .select(
        'id, name, slug, youtube_channel:youtube_channels(youtube_channel_id)',
      )
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
          youtube_channel: channel.youtube_channel,
        }
      })
      .filter(isNonNullable)
  } catch (error) {
    logger.error('日付別の人気チャンネル取得に失敗しました', {
      date,
      error,
      limit,
    })
    return []
  }
}
