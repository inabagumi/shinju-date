import { TIME_ZONE } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import type { DateRange } from '../_components/date-range-picker'

/**
 * Parse date range from URL search params
 * @param searchParams URLSearchParams instance
 * @returns DateRange object with validated dates
 */
export function parseDateRangeFromUrl(
  searchParams: URLSearchParams,
): DateRange | null {
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  if (!fromParam || !toParam) {
    return null
  }

  try {
    // Validate date formats
    const startDate = Temporal.PlainDate.from(fromParam)
    const endDate = Temporal.PlainDate.from(toParam)
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()

    // Validate date range constraints
    if (Temporal.PlainDate.compare(startDate, endDate) > 0) {
      return null // Start date must be before or equal to end date
    }

    if (Temporal.PlainDate.compare(endDate, today) > 0) {
      return null // End date cannot be in the future
    }

    // Validate maximum period constraint (90 days)
    const daysDifference = endDate.since(startDate).days + 1
    if (daysDifference > 90) {
      return null
    }

    // Validate that start date is not too far in the past (90 days retention)
    const maxStartDate = today.subtract({ days: 89 })
    if (Temporal.PlainDate.compare(startDate, maxStartDate) < 0) {
      return null
    }

    return {
      endDate: endDate.toString(),
      startDate: startDate.toString(),
    }
  } catch {
    // Invalid date format
    return null
  }
}

/**
 * Get default date range (past 7 days)
 * @returns DateRange object with default dates
 */
export function getDefaultDateRange(): DateRange {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  return {
    endDate: today.toString(),
    startDate: today.subtract({ days: 6 }).toString(),
  }
}

/**
 * Parse selected date from URL search params
 * @param searchParams URLSearchParams instance
 * @returns Selected date string or null
 */
export function parseSelectedDateFromUrl(
  searchParams: URLSearchParams,
): string | null {
  const dateParam = searchParams.get('date')

  if (!dateParam) {
    return null
  }

  try {
    // Validate date format
    const selectedDate = Temporal.PlainDate.from(dateParam)
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()

    // Validate that selected date is not in the future
    if (Temporal.PlainDate.compare(selectedDate, today) > 0) {
      return null
    }

    // Validate that selected date is not too far in the past (90 days retention)
    const maxStartDate = today.subtract({ days: 89 })
    if (Temporal.PlainDate.compare(selectedDate, maxStartDate) < 0) {
      return null
    }

    return selectedDate.toString()
  } catch {
    // Invalid date format
    return null
  }
}

/**
 * Create URL search params string for date range
 * @param dateRange DateRange object
 * @param selectedDate Optional selected date string
 * @returns Query string with from, to, and optionally date parameters
 */
export function createDateRangeUrlParams(
  dateRange: DateRange,
  selectedDate?: string | null,
): string {
  const params = new URLSearchParams()
  params.set('from', dateRange.startDate)
  params.set('to', dateRange.endDate)

  if (selectedDate) {
    params.set('date', selectedDate)
  }

  return params.toString()
}
