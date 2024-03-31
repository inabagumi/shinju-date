import { Temporal } from 'temporal-polyfill'

export default function max(
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
