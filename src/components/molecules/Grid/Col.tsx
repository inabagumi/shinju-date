import clsx from 'clsx'
import { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

type BaseProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>

type Props = BaseProps & {
  size?: number
}

const Col: FC<Props> = ({ children, className, size = 12, ...props }) => (
  <div className={clsx('col', `col--${size}`, className)} {...props}>
    {children}
  </div>
)

export default Col
