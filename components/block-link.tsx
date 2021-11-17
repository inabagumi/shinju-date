import clsx from 'clsx'
import styles from './block-link.module.css'
import Link from './link'
import type { ComponentPropsWithoutRef, VFC } from 'react'

type Props = ComponentPropsWithoutRef<'a'>

const BlockLink: VFC<Props> = ({
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
