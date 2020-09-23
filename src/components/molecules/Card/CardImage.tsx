import clsx from 'clsx'
import { FC } from 'react'

type Props = Omit<JSX.IntrinsicElements['div'], 'ref'>

const CardImage: FC<Props> = ({ className, ...props }) => (
  <div className={clsx('card__image', className)} {...props} />
)

export default CardImage
