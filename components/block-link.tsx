import clsx from 'clsx'
import { type ComponentPropsWithoutRef, type FC } from 'react'
import styles from './block-link.module.css'
import Link from './link'

type Props = ComponentPropsWithoutRef<'a'>

const BlockLink: FC<Props> = ({
  children,
  className,
  href,
  rel,
  target,
  ...props
}) => {
  return href ? (
    <Link
      className={styles.blockLink}
      href={href}
      rel={rel}
      target={target}
      {...props}
    >
      {children}
    </Link>
  ) : (
    <div className={clsx(styles.blockLink, className)}>{children}</div>
  )
}

export default BlockLink
