import { Constants, type Enums } from '@shinju-date/database'
import { z } from 'zod'
import type { VideoSortField, VideoSortOrder } from './get-videos'

// Define the valid sort field and order values based on the types
const VALID_SORT_FIELDS: VideoSortField[] = ['published_at', 'updated_at']
const VALID_SORT_ORDERS: VideoSortOrder[] = ['asc', 'desc']

// Default values - shared constants to avoid duplication
export const DEFAULT_VALUES = {
  deleted: undefined,
  page: 1,
  platform: undefined,
  search: undefined,
  sortField: 'updated_at' as const,
  sortOrder: 'desc' as const,
  status: undefined,
  talentId: undefined,
  videoKind: undefined,
  visible: undefined,
} satisfies {
  deleted: boolean[] | undefined
  page: number
  platform: Enums<'platform_type'>[] | undefined
  search: string | undefined
  sortField: VideoSortField
  sortOrder: VideoSortOrder
  status: Enums<'video_status'>[] | undefined
  talentId: string[] | undefined
  videoKind: Enums<'video_kind'>[] | undefined
  visible: boolean[] | undefined
}

/**
 * 1つまたは複数の値を受け取り、enum の値だけを残すスキーマ。
 * 有効な値が1つもなければ `undefined` にする
 */
function enumValuesSchema<const T extends readonly [string, ...string[]]>(
  values: T,
) {
  const valueSchema = z.enum(values)

  return z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val): T[number][] | undefined => {
      if (!val) return undefined
      const validValues = (Array.isArray(val) ? val : [val]).filter(
        (v): v is T[number] => valueSchema.safeParse(v).success,
      )
      return validValues.length > 0 ? validValues : undefined
    })
}

/**
 * Zod schema for video management page search parameters
 * Validates and normalizes all query parameters with appropriate defaults
 */
export const videoSearchParamsSchema = z.object({
  // Deleted filter - support multiple values for multi-select
  deleted: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val): boolean[] | undefined => {
      if (!val) return undefined
      const values = Array.isArray(val) ? val : [val]
      const boolValues = values
        .map((v) => {
          if (v === 'true') return true
          if (v === 'false') return false
          return null
        })
        .filter((v): v is boolean => v !== null)
      return boolValues.length > 0 ? boolValues : undefined
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

  // Platform filter - support multiple values for multi-select
  platform: enumValuesSchema(Constants.public.Enums.platform_type),

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

  // Video status filter - support multiple values for multi-select
  status: enumValuesSchema(Constants.public.Enums.video_status),

  // Talent ID filter - support multiple values for multi-select
  talentId: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val): string[] | undefined => {
      if (!val) return undefined
      const values = Array.isArray(val) ? val : [val]
      const nonEmptyValues = values.filter((v) => v.trim() !== '')
      return nonEmptyValues.length > 0 ? nonEmptyValues : undefined
    }),

  // Video kind filter - support multiple values for multi-select
  videoKind: enumValuesSchema(Constants.public.Enums.video_kind),

  // Visibility filter - support multiple values for multi-select
  visible: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val): boolean[] | undefined => {
      if (!val) return undefined
      const values = Array.isArray(val) ? val : [val]
      const boolValues = values
        .map((v) => {
          if (v === 'true') return true
          if (v === 'false') return false
          return null
        })
        .filter((v): v is boolean => v !== null)
      return boolValues.length > 0 ? boolValues : undefined
    }),
})

export type VideoSearchParams = z.infer<typeof videoSearchParamsSchema>
