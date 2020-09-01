import clsx from 'clsx'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

type BaseProps = DetailedHTMLProps<
  HTMLAttributes<HTMLSpanElement>,
  HTMLSpanElement
>

type Props = BaseProps & {
  color?: 'danger' | 'info' | 'primary' | 'secondary' | 'success' | 'warning'
}

const Badge: FC<Props> = ({ children, className, color, ...props }) => (
  <span
    className={clsx('badge', className, color && `badge--${color}`)}
    {...props}
  >
    {children}
  </span>
)

export default Badge
