import classNames from 'classnames'
import React, { FC, ReactElement } from 'react'

interface Props {
  className?: string
  label?: string
  value: string
}

const Emoji: FC<Props> = ({ className, label, value }): ReactElement => {
  return (
    <>
      <span
        aria-label={label}
        className={classNames('emoji', className)}
        role="img"
      >
        {value}
      </span>

      <style jsx>{`
        .emoji {
          align-items: center;
          display: flex;
          font-family: Android Emoji, Apple Color Emoji, Noto Color Emoji,
            Segoe UI Emoji;
          height: 10px;
          justify-content: center;
          width: 10px;
        }
      `}</style>
    </>
  )
}

export default Emoji
