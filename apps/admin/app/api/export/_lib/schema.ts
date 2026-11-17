import { z } from 'zod'
import {
  MAX_RANGE_DAYS,
  parseDate,
  validateRange,
} from '@/lib/analytics/date-window'

/**
 * A date parameter. A value that is not a selectable date becomes `null` and
 * is treated like a missing parameter
 */
const dateParamSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return undefined
    return parseDate(val)
  })

/**
 * Schema for CSV export API parameters
 * Uses same parameter names as analytics pages (from, to, date)
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
  .refine(
    (data) => {
      // At least one of from, to, or date must be provided
      return data.from || data.to || data.date
    },
    {
      message: 'At least one of from, to, or date parameters is required',
    },
  )
  .transform((data) => {
    const { from, to, date, limit } = data

    // If date is provided, use it for single-day export
    if (date) {
      return {
        endDate: null,
        limit,
        selectedDate: date.toString(),
        startDate: date.toString(),
      }
    }

    // If from/to are provided, validate the range
    if (from && to) {
      const rangeError = validateRange(from, to)

      // Start date must be before or equal to end date
      if (rangeError === 'reversed') {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: 'Start date must be before or equal to end date',
            path: ['from'],
          },
        ])
      }

      // Maximum period constraint
      if (rangeError === 'too-long') {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
            path: ['from'],
          },
        ])
      }

      return {
        endDate: to.toString(),
        limit,
        selectedDate: null,
        startDate: from.toString(),
      }
    }

    // Use only from or to (fallback to single date)
    const singleDate = from || to
    if (!singleDate) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: 'At least one date parameter is required',
          path: ['from'],
        },
      ])
    }

    return {
      endDate: null,
      limit,
      selectedDate: singleDate.toString(),
      startDate: singleDate.toString(),
    }
  })

export type ExportSearchParams = z.infer<typeof exportSearchParamsSchema>
