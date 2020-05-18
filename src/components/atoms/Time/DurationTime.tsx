import React, { DetailedHTMLProps, FC, TimeHTMLAttributes } from 'react'

import { formatDuration, parseDuration } from '@/utils'

type Props = DetailedHTMLProps<
  TimeHTMLAttributes<HTMLTimeElement>,
  HTMLTimeElement
>

const DurationTime: FC<Props> = ({ dateTime = 'PT0S', ...props }) => {
  const duration = parseDuration(dateTime)

  return (
    <time dateTime={dateTime} {...props}>
      {formatDuration(duration)}
    </time>
  )
}

export default DurationTime
