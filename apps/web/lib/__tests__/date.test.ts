import { Temporal } from '@js-temporal/polyfill'
import { timeZone } from '../constants'
import { max, min } from '../date'

describe('max', () => {
  it('should returns the newest datetime given multiple datetimes.', () => {
    const dateTimeA = Temporal.ZonedDateTime.from({
      day: 3,
      month: 3,
      timeZone,
      year: 1999
    })
    const dateTimeB = Temporal.ZonedDateTime.from({
      day: 9,
      month: 6,
      timeZone,
      year: 2018
    })
    const result = max(dateTimeA, dateTimeB)

    expect(result).toBe(dateTimeB)
  })
})

describe('min', () => {
  it('should returns the oldest datetime given multiple datetimes.', () => {
    const dateTimeA = Temporal.ZonedDateTime.from({
      day: 3,
      month: 3,
      timeZone,
      year: 1999
    })
    const dateTimeB = Temporal.ZonedDateTime.from({
      day: 9,
      month: 6,
      timeZone,
      year: 2018
    })
    const result = min(dateTimeA, dateTimeB)

    expect(result).toBe(dateTimeA)
  })
})
