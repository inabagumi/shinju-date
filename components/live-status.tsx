import clsx from 'clsx'
import { addHours, getSeconds, isBefore, isEqual } from 'date-fns'
import { memo, useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import styles from './live-status.module.css'
import type { VFC } from 'react'
import type Video from '../types/Video'

type Props = {
  value: Video
}

const LiveStatus: VFC<Props> = ({ value }) => {
  const [now, setNow] = useState(() => new Date())
  const [statusRef, inView] = useInView()

  useEffect(() => {
    if (!inView) return

    const timerID = setInterval(() => {
      setNow(new Date())
    }, 5 * 1000)

    return (): void => {
      clearInterval(timerID)
    }
  }, [inView])

  const liveNow =
    isBefore(value.publishedAt, now) &&
    !value.duration &&
    getSeconds(value.publishedAt) > 0 &&
    isBefore(now, addHours(value.publishedAt, 12))

  return (
    <div ref={statusRef}>
      {liveNow && (
        <span className={clsx('badge', styles.liveNow)}>ライブ配信中</span>
      )}
    </div>
  )
}

export default memo(
  LiveStatus,
  ({ value: previousValue }, { value: nextValue }) =>
    isEqual(previousValue.publishedAt, nextValue.publishedAt) &&
    previousValue.duration?.seconds === nextValue.duration?.seconds &&
    previousValue.duration?.minutes === nextValue.duration?.minutes &&
    previousValue.duration?.hours === nextValue.duration?.hours
)
