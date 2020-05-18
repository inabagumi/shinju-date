import { Duration } from 'date-fns'

const ISO8601_DURATION_REGEXP = /^P(?:(?:(\d+(?:[.,]\d+)?)Y)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?|(\d+(?:[.,]\d+)?)W)$/

const ISO8601_DURATION_SUFFIXES = [
  'years',
  'months',
  'days',
  'hours',
  'minutes',
  'seconds',
  'weeks'
]

const parseDuration = (duration: string): Duration => {
  const match = duration.match(ISO8601_DURATION_REGEXP)

  return ISO8601_DURATION_SUFFIXES.reduce<Duration>((result, suffix, index) => {
    const value = parseFloat((match?.[index + 1] || '0').replace(/,/, '.'))

    return Number.isNaN(value) || value <= 0
      ? result
      : {
          ...result,
          [suffix]: value
        }
  }, {})
}

export default parseDuration
