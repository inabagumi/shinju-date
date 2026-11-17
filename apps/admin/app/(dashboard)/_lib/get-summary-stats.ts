import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { getRedisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'
import { unwrapCount } from '@/lib/supabase/query'
import {
  applyVideoSummaryFilter,
  VIDEO_SUMMARY_FILTERS,
  type VideoSummaryTile,
} from './video-summary-filters'

export interface SummaryStats {
  totalVideos: number
  visibleVideos: number
  scheduledVideos: number
  hiddenVideos: number
  deletedVideos: number
  totalTerms: number
  totalTalents: number
}

export interface TrendValue {
  current: number
  dayChange: number | null
  weekChange: number | null
}

export interface SummaryStatsWithTrends {
  totalVideos: TrendValue
  visibleVideos: TrendValue
  scheduledVideos: TrendValue
  hiddenVideos: TrendValue
  deletedVideos: TrendValue
  totalTerms: TrendValue
  totalTalents: TrendValue
}

/**
 * Get summary statistics about videos and terms
 * @param includeTrends - If true, returns data with trend indicators (day-over-day and week-over-week)
 */
export async function getSummaryStats(): Promise<SummaryStats>
export async function getSummaryStats(
  includeTrends: true,
): Promise<SummaryStatsWithTrends>
export async function getSummaryStats(
  includeTrends?: boolean,
): Promise<SummaryStats | SummaryStatsWithTrends> {
  const supabaseClient = await createSupabaseServerClient()

  const countVideos = async (tile: VideoSummaryTile) =>
    unwrapCount(
      await applyVideoSummaryFilter(
        supabaseClient
          .from('videos')
          .select('*', { count: 'exact', head: true }),
        VIDEO_SUMMARY_FILTERS[tile],
      ),
      `getSummaryStats.${tile}`,
    )

  const [
    totalVideos,
    visibleVideos,
    scheduledVideos,
    hiddenVideos,
    deletedVideos,
  ] = await Promise.all([
    countVideos('totalVideos'),
    countVideos('visibleVideos'),
    countVideos('scheduledVideos'),
    countVideos('hiddenVideos'),
    countVideos('deletedVideos'),
  ])

  // Get total terms count
  const totalTerms = unwrapCount(
    await supabaseClient
      .from('terms')
      .select('*', { count: 'exact', head: true }),
    'getSummaryStats.totalTerms',
  )

  // Get total talents count
  const totalTalents = unwrapCount(
    await supabaseClient
      .from('talents')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),
    'getSummaryStats.totalTalents',
  )

  const currentStats: SummaryStats = {
    deletedVideos,
    hiddenVideos,
    scheduledVideos,
    totalTalents,
    totalTerms,
    totalVideos,
    visibleVideos,
  }

  // If trends not requested, return current data only
  if (!includeTrends) {
    return currentStats
  }

  // Get yesterday's and last week's snapshots for trends
  // Note: Snapshots are now saved by the daily batch job (/stats/snapshot)
  // so we only read them here, not write them
  const redisClient = getRedisClient()
  const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)

  const yesterday = now.subtract({ days: 1 })
  const lastWeek = now.subtract({ days: 7 })

  const yesterdayKey = formatDateKey(yesterday)
  const lastWeekKey = formatDateKey(lastWeek)

  const [yesterdayStats, lastWeekStats] = await Promise.all([
    redisClient.get<SummaryStats>(
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${yesterdayKey}`,
    ),
    redisClient.get<SummaryStats>(
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${lastWeekKey}`,
    ),
  ])

  // Calculate trends
  const calculateTrend = (
    current: number,
    previous: number | undefined,
  ): number | null => {
    if (previous === undefined) return null
    return current - previous
  }

  return {
    deletedVideos: {
      current: currentStats.deletedVideos,
      dayChange: calculateTrend(
        currentStats.deletedVideos,
        yesterdayStats?.deletedVideos,
      ),
      weekChange: calculateTrend(
        currentStats.deletedVideos,
        lastWeekStats?.deletedVideos,
      ),
    },
    hiddenVideos: {
      current: currentStats.hiddenVideos,
      dayChange: calculateTrend(
        currentStats.hiddenVideos,
        yesterdayStats?.hiddenVideos,
      ),
      weekChange: calculateTrend(
        currentStats.hiddenVideos,
        lastWeekStats?.hiddenVideos,
      ),
    },
    scheduledVideos: {
      current: currentStats.scheduledVideos,
      dayChange: calculateTrend(
        currentStats.scheduledVideos,
        yesterdayStats?.scheduledVideos,
      ),
      weekChange: calculateTrend(
        currentStats.scheduledVideos,
        lastWeekStats?.scheduledVideos,
      ),
    },
    totalTalents: {
      current: currentStats.totalTalents,
      dayChange: calculateTrend(
        currentStats.totalTalents,
        yesterdayStats?.totalTalents,
      ),
      weekChange: calculateTrend(
        currentStats.totalTalents,
        lastWeekStats?.totalTalents,
      ),
    },
    totalTerms: {
      current: currentStats.totalTerms,
      dayChange: calculateTrend(
        currentStats.totalTerms,
        yesterdayStats?.totalTerms,
      ),
      weekChange: calculateTrend(
        currentStats.totalTerms,
        lastWeekStats?.totalTerms,
      ),
    },
    totalVideos: {
      current: currentStats.totalVideos,
      dayChange: calculateTrend(
        currentStats.totalVideos,
        yesterdayStats?.totalVideos,
      ),
      weekChange: calculateTrend(
        currentStats.totalVideos,
        lastWeekStats?.totalVideos,
      ),
    },
    visibleVideos: {
      current: currentStats.visibleVideos,
      dayChange: calculateTrend(
        currentStats.visibleVideos,
        yesterdayStats?.visibleVideos,
      ),
      weekChange: calculateTrend(
        currentStats.visibleVideos,
        lastWeekStats?.visibleVideos,
      ),
    },
  }
}
