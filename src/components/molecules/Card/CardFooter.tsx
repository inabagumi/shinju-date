import clsx from 'clsx'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

type Props = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>

const CardImage: FC<Props> = ({ className, ...props }) => (
  <div className={clsx('card__footer', className)} {...props} />
)

export default CardImage
