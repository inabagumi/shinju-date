import { Temporal } from 'temporal-polyfill'
import { z } from 'zod'

/**
 * Validate a date string and ensure it's within allowed range
 */
function validateDateString(dateStr: string): string | null {
  try {
    const date = Temporal.PlainDate.from(dateStr)
    const today = Temporal.Now.zonedDateTimeISO('Asia/Tokyo').toPlainDate()

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
 * Schema for CSV export API parameters
 * Uses same parameter names as analytics pages (from, to, date)
 */
export const exportSearchParamsSchema = z
  .object({
    // Specific date for single-day data (date parameter)
    date: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return undefined
        return validateDateString(val)
      }),
    // Start date of the range (from parameter)
    from: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return undefined
        return validateDateString(val)
      }),

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
    to: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return undefined
        return validateDateString(val)
      }),
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
        selectedDate: date,
        startDate: date,
      }
    }

    // If from/to are provided, validate the range
    if (from && to) {
      const start = Temporal.PlainDate.from(from)
      const end = Temporal.PlainDate.from(to)

      // Start date must be before or equal to end date
      if (Temporal.PlainDate.compare(start, end) > 0) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: 'Start date must be before or equal to end date',
            path: ['from'],
          },
        ])
      }

      // Maximum period constraint (90 days)
      const daysDifference = end.since(start).days + 1
      if (daysDifference > 90) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: 'Date range cannot exceed 90 days',
            path: ['from'],
          },
        ])
      }

      return {
        endDate: to,
        limit,
        selectedDate: null,
        startDate: from,
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
      selectedDate: singleDate,
      startDate: singleDate,
    }
  })

export type ExportSearchParams = z.infer<typeof exportSearchParamsSchema>
