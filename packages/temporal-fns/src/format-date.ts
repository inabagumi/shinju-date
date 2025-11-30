import type { Temporal } from 'temporal-polyfill'

/**
 * Formats a date into a compact YYYYMMDD string specifically designed for use in Redis keys and other key-based storage systems.
 *
 * This function generates an 8-digit date string without separators, optimized for:
 * - Redis key construction (e.g., `summary:stats:20251111`)
 * - Cache key generation
 * - URL-safe date identifiers
 * - Chronologically sortable date strings
 *
 * @param timestamp - A Temporal.ZonedDateTime or Temporal.PlainDate object representing the date to format
 * @returns An 8-character string in YYYYMMDD format (e.g., "20251111" for November 11, 2025)
 *
 * @example
 * ```typescript
 * import { formatDateKey } from '@shinju-date/temporal-fns'
 * import { REDIS_KEYS } from '@shinju-date/constants'
 * import { Temporal } from 'temporal-polyfill'
 *
 * const now = Temporal.Now.zonedDateTimeISO('Asia/Tokyo')
 * const dateKey = formatDateKey(now) // "20251111"
 * const redisKey = `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${dateKey}` // "summary:stats:20251111"
 * ```
 */
export default function formatDateKey(
  timestamp: Temporal.ZonedDateTime | Temporal.PlainDate,
): string {
  return [
    timestamp.year.toString(10).padStart(4, '0'),
    timestamp.month.toString(10).padStart(2, '0'),
    timestamp.day.toString(10).padStart(2, '0'),
  ].join('')
}
