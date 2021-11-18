import { Temporal } from '@js-temporal/polyfill'
import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useIntl } from 'react-intl'
import styles from './live-status.module.css'
import type { Video } from '../lib/algolia'
import type { VFC } from 'react'

function getNow(timeZone = 'UTC'): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(timeZone)
}

type Props = {
  value: Video
}

const LiveStatus: VFC<Props> = ({ value }) => {
  const intl = useIntl()
  const [now, setNow] = useState(() => getNow(intl.timeZone ?? 'UTC'))
  const publishedAt = useMemo(
    () =>
      Temporal.Instant.fromEpochSeconds(value.publishedAt).toZonedDateTimeISO(
        intl.timeZone ?? 'UTC'
      ),
    [value.publishedAt, intl.timeZone]
  )
  const duration = useMemo(
    () => Temporal.Duration.from(value.duration ?? 'P0D'),
    [value.duration]
  )
  const [statusRef, inView] = useInView()

  useEffect(() => {
    if (!inView) return

    const timerID = setInterval(() => {
      setNow(getNow(intl.timeZone))
    }, 5 * 1000)

    return (): void => {
      clearInterval(timerID)
    }
  }, [inView, intl.timeZone])

  const liveNow =
    Temporal.ZonedDateTime.compare(publishedAt, now) < 1 &&
    Temporal.ZonedDateTime.compare(now, publishedAt.add({ hours: 12 })) < 1 &&
    duration.total({ unit: 'second' }) < 1 &&
    publishedAt.second > 0

  return (
    <div ref={statusRef}>
      {liveNow && (
        <span className={clsx('badge', styles.liveNow)}>ライブ配信中</span>
      )}
    </div>
  )
}

export default LiveStatus
