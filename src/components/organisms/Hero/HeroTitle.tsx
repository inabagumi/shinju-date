import clsx from 'clsx'
import { FC, HTMLAttributes } from 'react'

type Props = HTMLAttributes<HTMLHeadingElement>

const HeroTitle: FC<Props> = ({ children, className, ...props }) => (
  <h1 className={clsx('hero__title', className)} {...props}>
    {children}
  </h1>
)

export default HeroTitle
