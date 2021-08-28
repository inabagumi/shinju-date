import { Duration } from 'date-fns'

const formatDuration = (duration: Duration): string =>
  [duration.hours || 0, duration.minutes || 0, duration.seconds || 0]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')

export default formatDuration
