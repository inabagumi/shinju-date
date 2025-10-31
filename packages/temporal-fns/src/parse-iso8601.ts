import { Temporal } from 'temporal-polyfill'

export default function parseISO8601(isoString: string): Temporal.Instant {
  return Temporal.Instant.from(isoString)
}
