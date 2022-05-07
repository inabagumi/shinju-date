import clsx from 'clsx'
import { type FC } from 'react'
import styles from './skeleton.module.css'

type Props = {
  className?: string
  variant?: 'circle' | 'rect' | 'text'
}

const Skeleton: FC<Props> = ({ className, variant = 'text' }) => (
  <span
    className={clsx(styles.skeleton, className, { [styles[variant]]: true })}
  />
)

export default Skeleton
