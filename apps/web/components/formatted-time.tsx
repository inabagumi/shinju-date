'use client'

import { Temporal } from 'temporal-polyfill'
import { useNow } from './timer'

export default function FormattedTime({
  className,
  dateTime,
  options: { dateStyle = undefined, timeStyle = 'short' } = {}
}: {
  className?: string | undefined
  dateTime: Temporal.ZonedDateTime
  options?: Pick<Intl.DateTimeFormatOptions, 'dateStyle' | 'timeStyle'>
}) {
  const now = useNow()

  return (
    <time
      className={className}
      dateTime={dateTime.toString({ timeZoneName: 'never' })}
      title={dateTime.toLocaleString('ja-JP', {
        dateStyle: 'short',
        timeStyle: 'medium'
      })}
    >
      {dateTime.toLocaleString('ja-JP', {
        day: dateStyle ? '2-digit' : undefined,
        hour: timeStyle ? '2-digit' : undefined,
        minute: timeStyle ? '2-digit' : undefined,
        month: dateStyle ? '2-digit' : undefined,
        second: timeStyle && timeStyle !== 'short' ? '2-digit' : undefined,
        year: dateStyle && now.year !== dateTime.year ? 'numeric' : undefined
      })}
    </time>
  )
}
