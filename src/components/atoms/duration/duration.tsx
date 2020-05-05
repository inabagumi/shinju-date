import classNames from 'classnames'
import React, { FC } from 'react'
import { Duration as DurationObject, format } from '../../../time/duration'

type Props = {
  className?: string
  value: DurationObject
}

const Duration: FC<Props> = ({ className, value }) => (
  <>
    <span className={classNames('duration', className)}>{format(value)}</span>

    <style jsx>{`
      .duration {
        background-color: rgba(0, 0, 0, 0.85);
        border-radius: 0.3em;
        color: #fff;
        display: inline-block;
        font-size: 0.8rem;
        font-weight: 500;
        line-height: 1;
        padding: 0.3em;
      }
    `}</style>
  </>
)

export default Duration
