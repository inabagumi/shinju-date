'use client'

import {
  formatDate,
  formatDateTimeWithSeconds,
  formatTime,
} from '@shinju-date/temporal-fns'
import { useNow } from './timer'

export default function FormattedTime({
  className,
  dateTime,
  options: { dateStyle = undefined, timeStyle = 'short' } = {},
}: {
  className?: string | undefined
  dateTime: Temporal.ZonedDateTime
  options?: Pick<Intl.DateTimeFormatOptions, 'dateStyle' | 'timeStyle'>
}) {
  const now = useNow()
  // Build the text without `toLocaleString`, whose output differs between the
  // native Temporal and temporal-polyfill and causes hydration errors.
  const formatted = [
    dateStyle
      ? formatDate(dateTime, { includeYear: now.year !== dateTime.year })
      : undefined,
    timeStyle
      ? formatTime(dateTime, { includeSeconds: timeStyle !== 'short' })
      : undefined,
  ]
    .filter((value) => value !== undefined)
    .join(' ')

  return (
    <time
      className={className}
      dateTime={dateTime.toString({
        timeZoneName: 'never',
      })}
      title={formatDateTimeWithSeconds(dateTime)}
    >
      {formatted}
    </time>
  )
}
