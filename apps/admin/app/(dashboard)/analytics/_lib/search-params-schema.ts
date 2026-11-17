import { z } from 'zod'
import {
  getDefaultDateRange,
  parseDate,
  validateRange,
} from '@/lib/analytics/date-window'

/**
 * Validate a date range ensuring both dates are selectable, start <= end and
 * the length is within the limit
 */
function parseDateRange(
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string } | null {
  const start = parseDate(startDate)
  const end = parseDate(endDate)

  if (!start || !end || validateRange(start, end) !== null) {
    return null
  }

  return { endDate: end.toString(), startDate: start.toString() }
}

/**
 * Zod schema for analytics page search parameters
 * Validates and normalizes from, to, date, and tab parameters with appropriate defaults
 */
export const analyticsSearchParamsSchema = z
  .object({
    // Specific date for drill-down views (date parameter)
    date: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) => {
        if (Array.isArray(val)) {
          val = val[0]
        }
        if (!val) return undefined
        return parseDate(val)?.toString() ?? null
      }),

    // Start date of the range (from parameter)
    from: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) => {
        if (Array.isArray(val)) {
          val = val[0]
        }
        return val || undefined
      }),

    // Active tab for tabbed interfaces (tab parameter)
    tab: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) => {
        if (Array.isArray(val)) {
          val = val[0]
        }
        return val || undefined
      }),

    // End date of the range (to parameter)
    to: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) => {
        if (Array.isArray(val)) {
          val = val[0]
        }
        return val || undefined
      }),
  })
  .transform((data) => {
    const { from, to, date, tab } = data

    // Determine the date range for the chart
    let dateRange: { startDate: string; endDate: string }

    // If both from and to are provided, use them for the chart range
    if (from && to) {
      dateRange = parseDateRange(from, to) ?? getDefaultDateRange()
    } else {
      // Fall back to default range
      dateRange = getDefaultDateRange()
    }

    // The selected date is used for filtering rankings independently
    const selectedDate = date || null

    return {
      dateRange,
      selectedDate,
      tab: tab || null,
    }
  })

export type AnalyticsSearchParams = z.infer<typeof analyticsSearchParamsSchema>
