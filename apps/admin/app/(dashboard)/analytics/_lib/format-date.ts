import { formatDate } from '@shinju-date/temporal-fns'

interface FormatDateLabelOptions {
  includeYear?: boolean
}

/**
 * Formats an ISO 8601 date (`YYYY-MM-DD`) used in the URL as `YYYY/MM/DD`
 * (or `MM/DD`), the same format as the other screens of the admin UI.
 */
export function formatDateLabel(
  isoDate: string,
  options: FormatDateLabelOptions = {},
): string {
  return formatDate(Temporal.PlainDate.from(isoDate), options)
}

interface DateRange {
  endDate: string
  startDate: string
}

/**
 * Formats a date range as `YYYY/MM/DD 〜 YYYY/MM/DD`.
 */
export function formatDateRange({ endDate, startDate }: DateRange): string {
  return `${formatDateLabel(startDate)} 〜 ${formatDateLabel(endDate)}`
}
