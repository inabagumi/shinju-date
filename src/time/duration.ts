const ISO8601_DURATION_REGEXP = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+))S$/

export type Duration = {
  hours: number
  minutes: number
  seconds: number
}

export const format = (duration: Duration): string =>
  [duration.hours, duration.minutes, duration.seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')

export const parse = (duration: string): Duration => {
  const match = duration.match(ISO8601_DURATION_REGEXP)

  return {
    hours: parseInt(match?.[1] || '0', 10),
    minutes: parseInt(match?.[2] || '0', 10),
    seconds: parseInt(match?.[3] || '0', 10)
  }
}
