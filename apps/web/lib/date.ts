import { Temporal } from '@js-temporal/polyfill'

export function max(
  ...values: Temporal.ZonedDateTime[]
): Temporal.ZonedDateTime {
  if (!values[0]) {
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
  if (!values[0]) {
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
