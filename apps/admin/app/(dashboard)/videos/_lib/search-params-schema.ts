import { z } from 'zod'

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
      if (!val) return 1
      const num = Number(val)
      return Number.isNaN(num) || num < 1 ? 1 : num
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
      return val === 'published_at' || val === 'updated_at' ? val : 'updated_at'
    }),

  // Sort order - only allow valid values, handle arrays
  sortOrder: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (Array.isArray(val)) {
        val = val[0]
      }
      return val === 'asc' || val === 'desc' ? val : 'desc'
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
