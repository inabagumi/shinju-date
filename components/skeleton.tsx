import clsx from 'clsx'
import type { VFC } from 'react'
import styles from './skeleton.module.css'

type Props = {
  className?: string
  variant?: 'circle' | 'rect' | 'text'
}

const Skeleton: VFC<Props> = ({ className, variant = 'text' }) => (
  <span
    className={clsx(styles.skeleton, className, { [styles[variant]]: true })}
  />
)

export default Skeleton
