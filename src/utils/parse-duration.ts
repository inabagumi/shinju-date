import { Duration } from 'date-fns'

const ISO8601_DURATION_REGEXP = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+))S$/

const parseDuration = (duration: string): Duration => {
  const match = duration.match(ISO8601_DURATION_REGEXP)

  return {
    hours: parseInt(match?.[1] || '0', 10),
    minutes: parseInt(match?.[2] || '0', 10),
    seconds: parseInt(match?.[3] || '0', 10)
  }
}

export default parseDuration
