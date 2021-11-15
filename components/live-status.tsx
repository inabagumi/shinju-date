import clsx from 'clsx'
import { addHours, getSeconds, isBefore } from 'date-fns'
import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import styles from './live-status.module.css'
import type { Video } from '../lib/algolia'
import type { VFC } from 'react'

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
    (!value.duration || value.duration === 'P0D') &&
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

export default LiveStatus
