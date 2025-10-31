import { TIME_ZONE } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import { z } from 'zod'

/**
 * Default date range (past 7 days)
 */
export function getDefaultDateRange() {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  return {
    endDate: today.toString(),
    startDate: today.subtract({ days: 6 }).toString(),
  }
}

/**
 * Validate a date string and ensure it's within allowed range
 */
function validateDateString(dateStr: string): string | null {
  try {
    const date = Temporal.PlainDate.from(dateStr)
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()

    // Date cannot be in the future
    if (Temporal.PlainDate.compare(date, today) > 0) {
      return null
    }

    // Date cannot be more than 90 days old (retention limit)
    const maxPastDate = today.subtract({ days: 89 })
    if (Temporal.PlainDate.compare(date, maxPastDate) < 0) {
      return null
    }

    return date.toString()
  } catch {
    return null
  }
}

/**
 * Validate a date range ensuring start <= end and within constraints
 */
function validateDateRange(
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string } | null {
  const validStart = validateDateString(startDate)
  const validEnd = validateDateString(endDate)

  if (!validStart || !validEnd) {
    return null
  }

  const start = Temporal.PlainDate.from(validStart)
  const end = Temporal.PlainDate.from(validEnd)

  // Start date must be before or equal to end date
  if (Temporal.PlainDate.compare(start, end) > 0) {
    return null
  }

  // Maximum period constraint (90 days)
  const daysDifference = end.since(start).days + 1
  if (daysDifference > 90) {
    return null
  }

  return { endDate: validEnd, startDate: validStart }
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
        return validateDateString(val)
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
      const validRange = validateDateRange(from, to)
      if (validRange) {
        dateRange = validRange
      } else {
        dateRange = getDefaultDateRange()
      }
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

/**
 * Create URL search params string for analytics date range and tab
 */
export function createAnalyticsUrlParams(
  dateRange: { startDate: string; endDate: string },
  selectedDate?: string | null,
  tab?: string | null,
): string {
  const params = new URLSearchParams()

  if (selectedDate) {
    params.set('date', selectedDate)
  } else {
    params.set('from', dateRange.startDate)
    params.set('to', dateRange.endDate)
  }

  if (tab) {
    params.set('tab', tab)
  }

  return params.toString()
}
