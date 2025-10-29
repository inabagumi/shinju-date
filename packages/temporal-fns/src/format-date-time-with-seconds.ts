import { Temporal } from 'temporal-polyfill'

export default function formatDateTimeWithSeconds(
  timestamp: Temporal.ZonedDateTime,
): string {
  return timestamp.toLocaleString('ja-JP', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTimeFromISO(isoString: string): string {
  const instant = Temporal.Instant.from(isoString)
  // Use JST timezone
  const zonedDateTime = instant.toZonedDateTimeISO('Asia/Tokyo')
  return formatDateTimeWithSeconds(zonedDateTime)
}
