'use client'

import { Temporal } from '@js-temporal/polyfill'
import clsx from 'clsx'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormattedRelativeTime, FormattedTime, useIntl } from 'react-intl'
import aa from 'search-insights'
import { type Video } from '@/lib/algolia'
import Skeleton from './skeleton'
import styles from './video-card.module.css'

const defaultPreSrc =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII='

function formatDuration(duration: Temporal.Duration): string {
  return [duration.hours, duration.minutes, duration.seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

type TimeOptions = {
  relativeTime?: boolean
}

type Props = {
  timeOptions: TimeOptions
  value: Video
}

function VideoCardInner({ timeOptions, value }: Props): JSX.Element {
  const intl = useIntl()
  const [now] = useState(() => Temporal.Now.instant())
  const publishedAt = useMemo(() => {
    const timeZone = Temporal.TimeZone.from(intl.timeZone ?? 'UTC')
    const epochSeconds = value?.publishedAt ?? 0

    return Temporal.Instant.fromEpochSeconds(epochSeconds).toZonedDateTimeISO(
      timeZone
    )
  }, [value?.publishedAt, intl.timeZone])
  const duration = useMemo(
    () => Temporal.Duration.from(value?.duration ?? 'P0D'),
    [value?.duration]
  )
  const [liveNow, setLiveNow] = useState(false)

  useEffect(() => {
    const instantPublishedAt = publishedAt.toInstant()

    setLiveNow(
      () =>
        Temporal.Instant.compare(instantPublishedAt, now) < 1 &&
        Temporal.Instant.compare(now, instantPublishedAt.add({ hours: 12 })) <
          1 &&
        duration.total({ unit: 'second' }) < 1 &&
        publishedAt.second > 0
    )
  }, [now, publishedAt, duration])

  return (
    <div className={clsx('card', styles.video)}>
      <div className={clsx('card__image', styles.image)}>
        {value.thumbnail && (
          <Image
            alt=""
            blurDataURL={value.thumbnail.preSrc ?? defaultPreSrc}
            className={styles.thumbnail}
            fill
            placeholder="blur"
            sizes="(max-width: 996px) 100vw, 30vw"
            src={value.thumbnail.src}
          />
        )}

        {duration.total({ unit: 'second' }) > 0 ? (
          <span className={clsx('badge', styles.duration)}>
            <time dateTime={duration.toJSON()}>{formatDuration(duration)}</time>
          </span>
        ) : liveNow ? (
          <span className={clsx('badge', styles.liveNow)}>ライブ配信中</span>
        ) : null}
      </div>

      <div className="card__body">
        <h3 className={styles.title}>{value.title}</h3>
      </div>

      <div className="card__footer">
        <time
          className={styles.published}
          dateTime={publishedAt.toInstant().toJSON()}
          title={intl.formatDate(publishedAt.epochMilliseconds, {
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            month: 'long',
            second: '2-digit',
            year: 'numeric'
          })}
        >
          {timeOptions?.relativeTime ? (
            <FormattedRelativeTime
              numeric="auto"
              updateIntervalInSeconds={1}
              value={now
                .until(publishedAt.toInstant())
                .total({ unit: 'second' })}
            />
          ) : (
            <FormattedTime value={publishedAt.epochMilliseconds} />
          )}
        </time>
      </div>
    </div>
  )
}

export function VideoCardSkeleton(): JSX.Element {
  return (
    <div className={clsx('card', styles.video)}>
      <div className={clsx('card__image', styles.image)}>
        <Skeleton className={styles.thumbnailSkeleton} variant="rect" />
      </div>

      <div className="card__body">
        <h3 className={styles.title}>
          <Skeleton className={styles.titleSkeleton} variant="text" />
          <Skeleton className={styles.titleSkeleton} variant="text" />
        </h3>
      </div>

      <div className="card__footer">
        <span className={styles.published}>
          <Skeleton variant="text" />
        </span>
      </div>
    </div>
  )
}

export default function VideoCard({
  timeOptions = {},
  value
}: Partial<Props>): JSX.Element {
  const handleClick = useCallback(() => {
    if (value) {
      aa('clickedObjectIDs', {
        eventName: 'Click video card',
        index: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME,
        objectIDs: [value.id]
      })
    }
  }, [value])

  if (!value) {
    return (
      <div className={styles.blockLink}>
        <VideoCardSkeleton />
      </div>
    )
  }

  return (
    <a
      className={styles.blockLink}
      href={value.url}
      onClick={handleClick}
      rel="noopener noreferrer"
      target="_blank"
    >
      <VideoCardInner timeOptions={timeOptions} value={value} />
    </a>
  )
}
