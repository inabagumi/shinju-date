import { addHours, getSeconds, isBefore, isEqual } from 'date-fns'
import React, { FC, memo, useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

import Badge from '@/components/atoms/Badge'
import type { Video } from '@/types'

import styles from './LiveStatus.module.css'

type Props = {
  value: Video
}

const LiveStatus: FC<Props> = ({ value }) => {
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
      {liveNow && <Badge className={styles.liveNow}>ライブ配信中</Badge>}
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
