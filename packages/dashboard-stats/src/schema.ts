import { z } from 'zod'

/** Counts of the videos, terms and talents shown on the dashboard. */
export interface SummaryStats {
  totalVideos: number
  visibleVideos: number
  scheduledVideos: number
  hiddenVideos: number
  deletedVideos: number
  totalTerms: number
  totalTalents: number
}

/** Counts of the searches and clicks of a day shown on the dashboard. */
export interface AnalyticsSummary {
  recentSearches: number
  totalPopularKeywords: number
  recentClicks: number
}

const count = z.number().int().nonnegative()

/** Validates a {@link SummaryStats} read from Redis. */
export const summaryStatsSchema = z.object({
  deletedVideos: count,
  hiddenVideos: count,
  scheduledVideos: count,
  totalTalents: count,
  totalTerms: count,
  totalVideos: count,
  visibleVideos: count,
}) satisfies z.ZodType<SummaryStats>

/** Validates an {@link AnalyticsSummary} read from Redis. */
export const analyticsSummarySchema = z.object({
  recentClicks: count,
  recentSearches: count,
  totalPopularKeywords: count,
}) satisfies z.ZodType<AnalyticsSummary>
