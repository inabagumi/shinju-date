import clsx from 'clsx'
import { formatISO, fromUnixTime } from 'date-fns'
import { useCallback, useMemo } from 'react'
import { FormattedRelativeTime, FormattedTime, useIntl } from 'react-intl'
import aa from 'search-insights'
import { parseDuration } from '../lib/date'
import BlockLink from './block-link'
import Duration from './duration'
import LiveStatus from './live-status'
import Skeleton from './skeleton'
import Thumbnail from './thumbnail'
import styles from './video-card.module.css'
import type { Video } from '../lib/algolia'
import type { VFC } from 'react'

type TimeOptions = {
  relativeTime?: boolean
}

type Props = {
  timeOptions?: TimeOptions
  value?: Video
}

const VideoCard: VFC<Props> = ({ timeOptions, value }) => {
  const now = useMemo(() => Date.now(), [])
  const publishedAt = useMemo(
    () => value?.publishedAt && fromUnixTime(value.publishedAt),
    [value?.publishedAt]
  )
  const intl = useIntl()

  const handleClick = useCallback(() => {
    if (value?.id) {
      aa('clickedObjectIDs', {
        eventName: 'Click video card',
        index: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME,
        objectIDs: [value.id]
      })
    }
  }, [value?.id])

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

          {value?.duration && value.duration !== 'P0D' ? (
            <span className={clsx('badge', styles.duration)}>
              <time dateTime={value.duration}>
                <Duration value={parseDuration(value.duration)} />
              </time>
            </span>
          ) : value ? (
            <LiveStatus value={value} />
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
          {publishedAt ? (
            <time
              className={styles.published}
              dateTime={formatISO(publishedAt)}
              title={intl.formatDate(publishedAt, {
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
                  value={(publishedAt.getTime() - now) / 1000}
                />
              ) : (
                <FormattedTime value={publishedAt} />
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
