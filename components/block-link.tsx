import styles from './block-link.module.css'
import Link from './link'
import type { ReactNode, VFC } from 'react'

type Props = {
  children: ReactNode
  href?: string
}

const BlockLink: VFC<Props> = ({ href, ...props }) => {
  return href ? (
    <Link className={styles.blockLink} href={href} {...props} />
  ) : (
    <div className={styles.blockLink} {...props} />
  )
}

export default BlockLink
