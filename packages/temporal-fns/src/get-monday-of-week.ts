import { formatDateKey } from "./format-date-key.js";

/**
 * Get the Monday of the week for a given date.
 * Returns the date formatted as YYYYMMDD.
 *
 * @param dateTime - A Temporal.ZonedDateTime object
 * @returns The Monday of the week in YYYYMMDD format
 *
 * @example
 * ```typescript
 * import { getMondayOfWeek } from '@shinju-date/temporal-fns'
 *
 * const tuesday = Temporal.ZonedDateTime.from({
 *   year: 2025,
 *   month: 10,
 *   day: 14,
 *   timeZone: 'Asia/Tokyo',
 *   hour: 12,
 * })
 * const monday = getMondayOfWeek(tuesday) // '20251013'
 * ```
 */
export const getMondayOfWeek = (dateTime: Temporal.ZonedDateTime): string => {
  // 1 = Monday, 7 = Sunday
  const { dayOfWeek } = dateTime;
  const daysToSubtract = dayOfWeek - 1;
  const monday = dateTime.subtract({ days: daysToSubtract });
  return formatDateKey(monday);
};
