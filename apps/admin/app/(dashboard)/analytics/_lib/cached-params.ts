import { cache } from 'react'
import { analyticsSearchParamsSchema } from './search-params-schema'

/**
 * Cached search params parser to avoid duplicate validation across components
 */
export const parseAnalyticsSearchParams = cache(
  (searchParams: { [key: string]: string | string[] | undefined }) => {
    return analyticsSearchParamsSchema.parse(searchParams)
  },
)

/**
 * Cached function to get validated date range and selected date from search params
 * This ensures multiple components can access the same parsed values without re-validation
 */
export const getAnalyticsDateParams = cache(
  (searchParams: { [key: string]: string | string[] | undefined }) => {
    const parsed = parseAnalyticsSearchParams(searchParams)
    return {
      dateRange: parsed.dateRange,
      selectedDate: parsed.selectedDate,
    }
  },
)
