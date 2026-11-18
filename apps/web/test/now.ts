import { vi } from 'vitest'

/**
 * Fix the current time, both as an instant (`Temporal.Now.instant()`) and in
 * any time zone (`Temporal.Now.zonedDateTimeISO()`). Restore it with
 * `vi.restoreAllMocks()`.
 */
export function mockNow(value: string): void {
  const now = Temporal.Instant.from(value)

  vi.spyOn(Temporal.Now, 'instant').mockReturnValue(now)
  vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockImplementation((timeZone) =>
    now.toZonedDateTimeISO(timeZone ?? 'UTC'),
  )
}
