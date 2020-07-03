import clsx from 'clsx'
import React, { FC } from 'react'

type Props = Omit<JSX.IntrinsicElements['div'], 'ref'>

const CardHeader: FC<Props> = ({ className, ...props }) => (
  <div className={clsx('card__header', className)} {...props} />
)

export default CardHeader
