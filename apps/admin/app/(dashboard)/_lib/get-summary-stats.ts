import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

export type SummaryStats = {
  totalVideos: number
  visibleVideos: number
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

  // Get total video count (excluding deleted videos)
  const { count: totalVideos, error: totalError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (totalError) {
    throw new TypeError(totalError.message, {
      cause: totalError,
    })
  }

  // Get visible video count (excluding deleted videos)
  const { count: visibleVideos, error: visibleError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('visible', true)
    .is('deleted_at', null)

  if (visibleError) {
    throw new TypeError(visibleError.message, {
      cause: visibleError,
    })
  }

  // Get hidden video count (excluding deleted videos)
  const { count: hiddenVideos, error: hiddenError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('visible', false)
    .is('deleted_at', null)

  if (hiddenError) {
    throw new TypeError(hiddenError.message, {
      cause: hiddenError,
    })
  }

  // Get deleted video count
  const { count: deletedVideos, error: deletedError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .not('deleted_at', 'is', null)

  if (deletedError) {
    throw new TypeError(deletedError.message, {
      cause: deletedError,
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
  const redisClient = getRedisClient()
  const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const todayKey = formatDateKey(now)

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

  // Store today's snapshot for future comparisons (with 30 days TTL)
  await redisClient.set(
    `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${todayKey}`,
    currentStats,
    { ex: 30 * 24 * 60 * 60 }, // 30 days
  )

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
