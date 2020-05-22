import clsx from 'clsx'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

type BaseProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>

type Props = BaseProps & {
  fluid?: boolean
}

const Container: FC<Props> = ({ children, className, fluid = false }) => (
  <div
    className={clsx('container', className, {
      'container--fluid': fluid
    })}
  >
    {children}
  </div>
)

export default Container
