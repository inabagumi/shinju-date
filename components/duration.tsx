import { Temporal } from '@js-temporal/polyfill'
import type { VFC } from 'react'

function formatDuration(duration: Temporal.Duration): string {
  return [duration.hours, duration.minutes, duration.seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

type Props = {
  value: Temporal.Duration
}

const Duration: VFC<Props> = ({ value }) => {
  return <>{formatDuration(value)}</>
}

export default Duration
