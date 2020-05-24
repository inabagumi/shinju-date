import clsx from 'clsx'
import React, { AnchorHTMLAttributes, Ref, forwardRef } from 'react'

import { InfimaButtonProps } from '@/types'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & InfimaButtonProps

function Button(
  {
    active = false,
    block = false,
    children,
    className,
    color,
    disabled,
    outline = false,
    role,
    size,
    ...props
  }: Props,
  ref?: Ref<HTMLAnchorElement>
): JSX.Element {
  return (
    <a
      className={clsx(
        'button',
        {
          'button--active': active,
          'button--block': block,
          'button--disabled': disabled,
          'button--outline': outline,
          [`button--${color}`]: !!color,
          [`button--${size}`]: !!size
        },
        className
      )}
      ref={ref}
      role={role ?? 'button'}
      {...props}
    >
      {children}
    </a>
  )
}

export default forwardRef(Button)
