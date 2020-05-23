import clsx from 'clsx'
import React, { FC, HTMLAttributes } from 'react'

type Props = HTMLAttributes<HTMLOrSVGElement> & {
  as?: keyof JSX.IntrinsicElements
}

const Card: FC<Props> = ({ className, as: Component = 'div', ...props }) => (
  <Component className={clsx('card', className)} {...props} />
)

export default Card
