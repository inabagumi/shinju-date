import { Temporal } from '@js-temporal/polyfill'
import clsx from 'clsx'
import { type VFC, useCallback, useEffect, useMemo, useState } from 'react'
import { FormattedRelativeTime, FormattedTime, useIntl } from 'react-intl'
import aa from 'search-insights'
import { type Video } from '../lib/algolia'
import BlockLink from './block-link'
import Duration from './duration'
import { useNow } from './layout'
import Skeleton from './skeleton'
import Thumbnail from './thumbnail'
import styles from './video-card.module.css'

type TimeOptions = {
  relativeTime?: boolean
}

type Props = {
  timeOptions?: TimeOptions
  value?: Video
}

const VideoCard: VFC<Props> = ({ timeOptions, value }) => {
  const intl = useIntl()
  const now = useNow()
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

  const handleClick = useCallback(() => {
    if (value?.id) {
      aa('clickedObjectIDs', {
        eventName: 'Click video card',
        index: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME,
        objectIDs: [value.id]
      })
    }
  }, [value?.id])

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
    <BlockLink
      href={value?.url}
      onClick={handleClick}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className={clsx('card', styles.video)}>
        <div className={clsx('card__image', styles.image)}>
          <Thumbnail value={value?.thumbnail} />

          {duration.total({ unit: 'second' }) > 0 ? (
            <span className={clsx('badge', styles.duration)}>
              <time dateTime={duration.toJSON()}>
                <Duration value={duration} />
              </time>
            </span>
          ) : liveNow ? (
            <span className={clsx('badge', styles.liveNow)}>ライブ配信中</span>
          ) : null}
        </div>

        <div className="card__body">
          {value ? (
            <h3 className={styles.title}>{value.title}</h3>
          ) : (
            <h3 className={styles.title}>
              <Skeleton className={styles.titleSkeleton} variant="text" />
              <Skeleton className={styles.titleSkeleton} variant="text" />
            </h3>
          )}
        </div>

        <div className="card__footer">
          {publishedAt.epochSeconds > 0 ? (
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
          ) : (
            <span className={styles.published}>
              <Skeleton variant="text" />
            </span>
          )}
        </div>
      </div>
    </BlockLink>
  )
}

export default VideoCard
