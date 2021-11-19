import { Temporal } from '@js-temporal/polyfill'
import type { DateArray } from 'ics'

export function convertToDateArray(
  dateTime: Temporal.ZonedDateTime
): DateArray {
  return [
    dateTime.year,
    dateTime.month,
    dateTime.day,
    dateTime.hour,
    dateTime.minute
  ]
}

export function max(
  ...values: Temporal.ZonedDateTime[]
): Temporal.ZonedDateTime {
  if (values.length < 1) {
    throw new TypeError('At least one argument is required.')
  }

  let result = values[0]

  for (const value of values.slice(1)) {
    if (Temporal.ZonedDateTime.compare(result, value) < 0) {
      result = value
    }
  }

  return result
}

export function min(
  ...values: Temporal.ZonedDateTime[]
): Temporal.ZonedDateTime {
  if (values.length < 1) {
    throw new TypeError('At least one argument is required.')
  }

  let result = values[0]

  for (const value of values.slice(1)) {
    if (Temporal.ZonedDateTime.compare(result, value) > 0) {
      result = value
    }
  }

  return result
}
