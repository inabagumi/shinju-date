import { padNumber } from "./pad-number.js";

interface FormatTimeOptions {
  includeSeconds?: boolean;
}

/**
 * Formats the time part of a timestamp as `HH:mm` (or `HH:mm:ss`).
 *
 * The output does not depend on the Temporal implementation, so it can be
 * used safely in components rendered on both the server and the client.
 */
export const formatTime = (
  timestamp: Temporal.ZonedDateTime | Temporal.PlainTime,
  options: FormatTimeOptions = {}
): string => {
  const { includeSeconds = false } = options;
  const hourAndMinute = `${padNumber(timestamp.hour)}:${padNumber(timestamp.minute)}`;

  return includeSeconds
    ? `${hourAndMinute}:${padNumber(timestamp.second)}`
    : hourAndMinute;
};
