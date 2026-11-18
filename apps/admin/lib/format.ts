import { TIME_ZONE } from "@shinju-date/constants";
import { formatDateTimeFromISO as formatDateTimeFromISOInTimeZone } from "@shinju-date/temporal-fns";

interface FormatDateTimeFromISOOptions {
  includeSeconds?: boolean;
}

/**
 * Formats an ISO 8601 string in `TIME_ZONE` as `YYYY/MM/DD HH:mm:ss` (or
 * `YYYY/MM/DD HH:mm` with `includeSeconds: false`).
 */
export const formatDateTimeFromISO = (
  isoString: string,
  options: FormatDateTimeFromISOOptions = {}
): string =>
  formatDateTimeFromISOInTimeZone(isoString, {
    ...options,
    timeZone: TIME_ZONE,
  });
