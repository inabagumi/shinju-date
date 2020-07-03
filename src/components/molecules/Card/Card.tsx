import clsx from 'clsx'
import React, { FC } from 'react'

type Props = Omit<JSX.IntrinsicElements['div'], 'ref'>

const Card: FC<Props> = ({ className, ...props }) => (
  <div className={clsx('card', className)} {...props} />
)

export default Card
