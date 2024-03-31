import { Temporal } from 'temporal-polyfill'

export default function startOfHour(
  zdt: Temporal.ZonedDateTime
): Temporal.ZonedDateTime {
  return zdt.with({
    microsecond: 0,
    millisecond: 0,
    minute: 0,
    nanosecond: 0,
    second: 0
  })
}
