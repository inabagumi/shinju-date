import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { getRedisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'
import {
  applyVideoSummaryFilter,
  VIDEO_SUMMARY_FILTERS,
  type VideoSummaryFilter,
} from './video-summary-filters'

export type SummaryStats = {
  totalVideos: number
  visibleVideos: number
  scheduledVideos: number
  hiddenVideos: number
  deletedVideos: number
  totalTerms: number
  totalTalents: number
}

export type TrendValue = {
  current: number
  dayChange: number | null
  weekChange: number | null
}

export type SummaryStatsWithTrends = {
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

  const countVideos = (filter: VideoSummaryFilter) =>
    applyVideoSummaryFilter(
      supabaseClient.from('videos').select('*', { count: 'exact', head: true }),
      filter,
    )

  const [
    { count: totalVideos, error: totalError },
    { count: visibleVideos, error: visibleError },
    { count: scheduledVideos, error: scheduledError },
    { count: hiddenVideos, error: hiddenError },
    { count: deletedVideos, error: deletedError },
  ] = await Promise.all([
    countVideos(VIDEO_SUMMARY_FILTERS.totalVideos),
    countVideos(VIDEO_SUMMARY_FILTERS.visibleVideos),
    countVideos(VIDEO_SUMMARY_FILTERS.scheduledVideos),
    countVideos(VIDEO_SUMMARY_FILTERS.hiddenVideos),
    countVideos(VIDEO_SUMMARY_FILTERS.deletedVideos),
  ])

  const videoError =
    totalError ?? visibleError ?? scheduledError ?? hiddenError ?? deletedError

  if (videoError) {
    throw new TypeError(videoError.message, {
      cause: videoError,
    })
  }

  // Get total terms count
  const { count: totalTerms, error: termsError } = await supabaseClient
    .from('terms')
    .select('*', { count: 'exact', head: true })

  if (termsError) {
    throw new TypeError(termsError.message, {
      cause: termsError,
    })
  }

  // Get total talents count
  const { count: totalTalents, error: talentsError } = await supabaseClient
    .from('talents')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (talentsError) {
    throw new TypeError(talentsError.message, {
      cause: talentsError,
    })
  }

  const currentStats: SummaryStats = {
    deletedVideos: deletedVideos ?? 0,
    hiddenVideos: hiddenVideos ?? 0,
    scheduledVideos: scheduledVideos ?? 0,
    totalTalents: totalTalents ?? 0,
    totalTerms: totalTerms ?? 0,
    totalVideos: totalVideos ?? 0,
    visibleVideos: visibleVideos ?? 0,
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
