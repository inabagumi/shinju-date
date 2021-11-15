import clsx from 'clsx'
import styles from './skeleton.module.css'
import type { VFC } from 'react'

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
