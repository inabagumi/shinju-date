import { z } from 'zod'
import type { VideoSortField, VideoSortOrder } from './get-videos'

// Define the valid sort field and order values based on the types
const VALID_SORT_FIELDS: VideoSortField[] = ['published_at', 'updated_at']
const VALID_SORT_ORDERS: VideoSortOrder[] = ['asc', 'desc']

// Default values - shared constants to avoid duplication
export const DEFAULT_VALUES = {
  channelId: undefined,
  deleted: undefined,
  page: 1,
  search: undefined,
  sortField: 'updated_at' as const,
  sortOrder: 'desc' as const,
  visible: undefined,
} satisfies {
  page: number
  sortField: VideoSortField
  sortOrder: VideoSortOrder
  channelId: number | undefined
  deleted: boolean | undefined
  search: string | undefined
  visible: boolean | undefined
}

/**
 * Zod schema for video management page search parameters
 * Validates and normalizes all query parameters with appropriate defaults
 */
export const videoSearchParamsSchema = z.object({
  // Channel ID filter (optional, coerced to number) - handle arrays
  channelId: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (Array.isArray(val)) {
        val = val[0]
      }
      if (!val) return undefined
      const num = Number(val)
      return Number.isNaN(num) || num < 1 ? undefined : num
    }),

  // Deleted filter (true/false or undefined) - handle arrays
  deleted: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (Array.isArray(val)) {
        val = val[0]
      }
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    }),
  // Page number with default of 1, coerced to number, clamped to minimum 1
  page: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (Array.isArray(val)) {
        val = val[0] // Take first element if array
      }
      if (!val) return DEFAULT_VALUES.page
      const num = Number(val)
      return Number.isNaN(num) || num < 1 ? DEFAULT_VALUES.page : num
    }),

  // Search query string (optional) - handle arrays by taking first element
  search: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (Array.isArray(val)) {
        return val[0] || undefined
      }
      return val || undefined
    }),

  // Sort field - only allow valid values, handle arrays
  sortField: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (Array.isArray(val)) {
        val = val[0]
      }
      return VALID_SORT_FIELDS.includes(val as VideoSortField)
        ? (val as VideoSortField)
        : DEFAULT_VALUES.sortField
    }),

  // Sort order - only allow valid values, handle arrays
  sortOrder: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (Array.isArray(val)) {
        val = val[0]
      }
      return VALID_SORT_ORDERS.includes(val as VideoSortOrder)
        ? (val as VideoSortOrder)
        : DEFAULT_VALUES.sortOrder
    }),

  // Visibility filter (true/false or undefined) - handle arrays
  visible: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (Array.isArray(val)) {
        val = val[0]
      }
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    }),
})

export type VideoSearchParams = z.infer<typeof videoSearchParamsSchema>
