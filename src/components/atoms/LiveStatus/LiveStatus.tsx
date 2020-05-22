import { isBefore, parseJSON } from 'date-fns'
import React, { FC, memo, useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

import Badge from '@/components/atoms/Badge'
import type { Video } from '@/types'
import { isZeroSeconds, parseDuration } from '@/utils'

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
    }, 30000)

    return (): void => {
      clearInterval(timerID)
    }
  }, [inView])

  const past = isBefore(parseJSON(value.publishedAt), now)
  const liveNow = past && isZeroSeconds(parseDuration(value.duration))

  return (
    <div ref={statusRef}>
      {liveNow && <Badge className={styles.liveNow}>ライブ配信中</Badge>}
    </div>
  )
}

export default memo(
  LiveStatus,
  ({ value: previousValue }, { value: nextValue }) =>
    previousValue.publishedAt === nextValue.publishedAt &&
    previousValue.duration === nextValue.duration
)
