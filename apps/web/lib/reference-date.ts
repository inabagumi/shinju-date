import { fetchCurrentTime } from './fetchers'

/**
 * The date (`YYYY-MM-DD` in `TIME_ZONE`) of `fetchCurrentTime`, the reference
 * of “today” that the server renders with and the browser hydrates with
 * (`useToday`).
 */
export async function getReferenceDate(): Promise<string> {
  const now = Temporal.ZonedDateTime.from(await fetchCurrentTime())

  return now.toPlainDate().toString()
}
