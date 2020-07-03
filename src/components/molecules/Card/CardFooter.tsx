import clsx from 'clsx'
import React, { FC } from 'react'

type Props = Omit<JSX.IntrinsicElements['div'], 'ref'>

const CardImage: FC<Props> = ({ className, ...props }) => (
  <div className={clsx('card__footer', className)} {...props} />
)

export default CardImage
