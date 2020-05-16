import React, { DetailedHTMLProps, FC, TimeHTMLAttributes } from 'react'

import formatDuration from 'utils/format-duration'
import parseDuration from 'utils/parse-duration'

type Props = DetailedHTMLProps<
  TimeHTMLAttributes<HTMLTimeElement>,
  HTMLTimeElement
>

const Duration: FC<Props> = ({ dateTime = 'PT0S', ...props }) => {
  const duration = parseDuration(dateTime)

  return (
    <time dateTime={dateTime} {...props}>
      {formatDuration(duration)}
    </time>
  )
}

export default Duration
