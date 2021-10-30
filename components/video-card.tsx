import clsx from 'clsx'
import { formatISODuration } from 'date-fns'
import { useMemo } from 'react'
import { FormattedRelativeTime, FormattedTime } from 'react-intl'
import formatDuration from '../utils/formatDuration'
import BlockLink from './block-link'
import LiveStatus from './live-status'
import Skeleton from './skeleton'
import Thumbnail from './thumbnail'
import styles from './video-card.module.css'
import type { VFC } from 'react'
import type Video from '../types/Video'

type TimeOptions = {
  relativeTime?: boolean
}

type Props = {
  timeOptions?: TimeOptions
  value?: Video
}

const VideoCard: VFC<Props> = ({ timeOptions, value }) => {
  const now = useMemo(() => Date.now(), [])

  return (
    <BlockLink href={value?.url}>
      <div className={clsx('card', styles.video)}>
        <div className={clsx('card__image', styles.image)}>
          {value ? (
            <Thumbnail value={value} />
          ) : (
            <Skeleton className={styles.thumbnailSkeleton} variant="rect" />
          )}

          {value?.duration ? (
            <span className={clsx('badge', styles.duration)}>
              <time dateTime={formatISODuration(value.duration)}>
                {formatDuration(value.duration)}
              </time>
            </span>
          ) : value ? (
            <LiveStatus value={value} />
          ) : null}
        </div>

        <div className={clsx('card__body', styles.content)}>
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
          {value?.publishedAt ? (
            <time
              className={styles.published}
              dateTime={value.publishedAt.toJSON()}
            >
              {timeOptions?.relativeTime ? (
                <FormattedRelativeTime
                  numeric="auto"
                  updateIntervalInSeconds={1}
                  value={(value.publishedAt.getTime() - now) / 1000}
                />
              ) : (
                <FormattedTime value={value.publishedAt} />
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
