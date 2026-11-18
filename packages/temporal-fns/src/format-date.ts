import { padNumber } from "./pad-number.js";

interface FormatDateOptions {
  includeYear?: boolean;
}

/**
 * Formats the date part of a timestamp as `YYYY/MM/DD` (or `MM/DD`).
 *
 * The output does not depend on the Temporal implementation, so it can be
 * used safely in components rendered on both the server and the client.
 */
export function formatDate(
  timestamp: Temporal.ZonedDateTime | Temporal.PlainDate,
  options: FormatDateOptions = {}
): string {
  const { includeYear = true } = options;
  const monthAndDay = `${padNumber(timestamp.month)}/${padNumber(timestamp.day)}`;

  return includeYear
    ? `${timestamp.year.toString(10)}/${monthAndDay}`
    : monthAndDay;
}
