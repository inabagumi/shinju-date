import { FC, DetailedHTMLProps, TimeHTMLAttributes } from 'react'

import DurationTime from './DurationTime'
import RelativeTime from './RelativeTime'
import SimpleTime from './SimpleTime'

type Props = DetailedHTMLProps<
  TimeHTMLAttributes<HTMLTimeElement>,
  HTMLTimeElement
> & {
  variant?: 'duration' | 'normal' | 'relative'
}

const Time: FC<Props> = ({
  dateTime = new Date().toISOString(),
  variant = 'normal',
  ...props
}) => {
  const Component =
    variant === 'duration'
      ? DurationTime
      : variant === 'relative'
      ? RelativeTime
      : SimpleTime

  return <Component dateTime={dateTime} {...props} />
}

export default Time
