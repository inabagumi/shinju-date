import { Temporal } from 'temporal-polyfill'

/**
 * Temporal object to a string format suitable for database insertion (TIMESTAMPTZ).
 * Normalizes the timestamp by rounding it down to the nearest second,
 * then converts it to a UTC Temporal.Instant and returns its ISO 8601 representation.
 * @param date - The Temporal.ZonedDateTime or Temporal.Instant object.
 * @returns An ISO 8601 string in UTC, truncated to the second (e.g., "2025-11-02T03:30:00Z").
 */
export default function toDBString(
  date: Temporal.Instant | Temporal.ZonedDateTime,
): string {
  const instant =
    date instanceof Temporal.ZonedDateTime ? date.toInstant() : date

  return instant.toString({
    roundingMode: 'floor',
    smallestUnit: 'second',
  })
}
