'use client'

import { useEffect, useState } from 'react'
import { Temporal } from 'temporal-polyfill'
import { useNow } from './timer'

function isActive({
  duration,
  now,
  publishedAt
}: {
  duration: Temporal.Duration
  now: Temporal.ZonedDateTime
  publishedAt: Temporal.ZonedDateTime
}): boolean {
  return (
    Temporal.ZonedDateTime.compare(publishedAt, now) < 1 &&
    Temporal.ZonedDateTime.compare(now, publishedAt.add({ hours: 12 })) < 1 &&
    duration.total({ unit: 'second' }) < 1 &&
    publishedAt.second > 0
  )
}

export default function LiveNow({
  className,
  duration,
  publishedAt
}: {
  className?: string | undefined
  duration: Temporal.Duration
  publishedAt: Temporal.ZonedDateTime
}) {
  const now = useNow()
  const [liveNow, setLiveNow] = useState(() =>
    isActive({ duration, now, publishedAt })
  )

  useEffect(() => {
    setLiveNow(() => isActive({ duration, now, publishedAt }))
  }, [now, publishedAt, duration])

  if (!liveNow) {
    return null
  }

  return <span className={className}>ライブ配信中</span>
}
