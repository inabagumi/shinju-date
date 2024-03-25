import clsx from 'clsx'
import styles from './skeleton.module.css'

type Props = {
  className?: string | undefined
  variant?: 'circle' | 'rect' | 'text'
}

export default function Skeleton({ className, variant = 'text' }: Props) {
  const style = styles[variant]

  return (
    <span
      className={clsx(
        styles['skeleton'],
        className,
        style && { [style]: true }
      )}
    />
  )
}
