import clsx from 'clsx'
import styles from './skeleton.module.css'

type Props = {
  className?: string
  variant?: 'circle' | 'rect' | 'text'
}

export default function Skeleton({
  className,
  variant = 'text'
}: Props): JSX.Element {
  return (
    <span
      className={clsx(styles.skeleton, className, { [styles[variant]]: true })}
    />
  )
}
