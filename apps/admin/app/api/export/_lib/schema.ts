import { z } from 'zod'
import {
  MAX_RANGE_DAYS,
  parseDateFormat,
  validateDate,
  validateRange,
} from '@/lib/analytics/date-window'
import type { Period } from '@/lib/analytics/period'

const DATE_KEYS = ['date', 'from', 'to'] as const

const DATE_ERROR_MESSAGES = {
  future: 'Date cannot be in the future',
  'invalid-format': 'Date must be a valid date in YYYY-MM-DD format',
  'too-old': `Date must be within the last ${MAX_RANGE_DAYS} days`,
} as const

const RANGE_ERROR_MESSAGES = {
  reversed: 'Start date must be before or equal to end date',
  'too-long': `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
} as const

/** A date parameter. An empty value is treated like a missing parameter */
const dateParamSchema = z
  .string()
  .optional()
  .transform((val) => val || undefined)

/**
 * Schema for CSV export API parameters
 * Uses same parameter names as analytics pages (from, to, date)
 *
 * - `date` exports the single day, ahead of `from` and `to`
 * - `from` and `to` export the range of them
 * - Only one of `from` and `to` exports the single day
 *
 * Every given date must be a selectable date, and the range of `from` and `to`
 * must follow the rules of `@/lib/analytics/date-window`. Otherwise the
 * parameters are rejected (instead of falling back to another period)
 */
export const exportSearchParamsSchema = z
  .object({
    // Specific date for single-day data (date parameter)
    date: dateParamSchema,
    // Start date of the range (from parameter)
    from: dateParamSchema,

    // Optional limit for number of records
    limit: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return 50
        const num = Number.parseInt(val, 10)
        return Number.isNaN(num) || num <= 0 ? 50 : Math.min(num, 1000)
      }),

    // End date of the range (to parameter)
    to: dateParamSchema,
  })
  .superRefine((data, context) => {
    const dates: Partial<
      Record<(typeof DATE_KEYS)[number], Temporal.PlainDate>
    > = {}

    for (const key of DATE_KEYS) {
      const value = data[key]

      if (value === undefined) continue

      const date = parseDateFormat(value)
      const error = date ? validateDate(date) : 'invalid-format'

      if (error) {
        context.addIssue({
          code: 'custom',
          message: DATE_ERROR_MESSAGES[error],
          path: [key],
        })
      } else if (date) {
        dates[key] = date
      }
    }

    if (!data.date && !data.from && !data.to) {
      context.addIssue({
        code: 'custom',
        message: 'At least one of from, to, or date parameters is required',
        path: ['from'],
      })
    }

    // `date` takes the place of the range
    if (data.date || !dates.from || !dates.to) return

    const rangeError = validateRange(dates.from, dates.to)

    if (rangeError) {
      context.addIssue({
        code: 'custom',
        message: RANGE_ERROR_MESSAGES[rangeError],
        path: ['from'],
      })
    }
  })
  .transform(({ date, from, limit, to }) => {
    if (!date && from && to) {
      return {
        limit,
        range: { end: to, start: from } satisfies Period,
        selectedDate: null,
      }
    }

    // `superRefine` makes sure that one of the dates is given
    const day = date || from || to || ''

    return {
      limit,
      range: { end: day, start: day } satisfies Period,
      selectedDate: day,
    }
  })

export type ExportSearchParams = z.infer<typeof exportSearchParamsSchema>
