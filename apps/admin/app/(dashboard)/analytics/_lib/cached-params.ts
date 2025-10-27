import { cache } from 'react'
import type { AnalyticsSearchParams } from './search-params-schema'

/**
 * Cached function to get validated date range, selected date, and tab from parsed search params
 * This ensures multiple components can access the same parsed values without re-validation
 */
export const getAnalyticsDateParams = cache(
  async (parsedSearchParams: Promise<AnalyticsSearchParams>) => {
    const parsed = await parsedSearchParams
    return {
      dateRange: parsed.dateRange,
      selectedDate: parsed.selectedDate,
      tab: parsed.tab,
    }
  },
)
