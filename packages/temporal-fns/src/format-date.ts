import type { Temporal } from 'temporal-polyfill'

export default function formatDate(timestamp: Temporal.ZonedDateTime | Temporal.PlainDate): string {
  return [
    timestamp.year.toString(10).padStart(4, '0'),
    timestamp.month.toString(10).padStart(2, '0'),
    timestamp.day.toString(10).padStart(2, '0'),
  ].join('')
}
