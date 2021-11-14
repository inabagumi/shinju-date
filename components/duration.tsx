import type { Duration as DurationObject } from 'date-fns'
import type { VFC } from 'react'

function formatDuration(duration: DurationObject): string {
  return [duration.hours || 0, duration.minutes || 0, duration.seconds || 0]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

type Props = {
  value: DurationObject
}

const Duration: VFC<Props> = ({ value }) => {
  return <>{formatDuration(value)}</>
}

export default Duration
