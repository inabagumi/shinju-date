/**
 * List every date from `start` to `end` (both inclusive) in ascending order.
 *
 * Returns an empty array when `start` is after `end`.
 */
export function listDatesInRange(
  start: Temporal.PlainDate,
  end: Temporal.PlainDate,
): Temporal.PlainDate[] {
  const dates: Temporal.PlainDate[] = []

  for (
    let date = start;
    Temporal.PlainDate.compare(date, end) <= 0;
    date = date.add({ days: 1 })
  ) {
    dates.push(date)
  }

  return dates
}
