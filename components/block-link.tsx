import styles from './block-link.module.css'
import Link from './link'
import type { ReactNode, VFC } from 'react'

type Props = {
  children: ReactNode
  href?: string
  rel?: string
  target?: string
}

const BlockLink: VFC<Props> = ({ href, rel, target, ...props }) => {
  return href ? (
    <Link
      className={styles.blockLink}
      href={href}
      rel={rel}
      target={target}
      {...props}
    />
  ) : (
    <div className={styles.blockLink} {...props} />
  )
}

export default BlockLink
