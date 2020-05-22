import clsx from 'clsx'
import React, { DetailedHTMLProps, FC, HTMLAttributes, memo } from 'react'

import LiveStatus from '@/components/atoms/LiveStatus'
import Skeleton from '@/components/atoms/Skeleton'
import Time from '@/components/atoms/Time'
import Thumbnail from '@/components/atoms/Thumbnail'
import type { Video } from '@/types'
import { isZeroSeconds, parseDuration } from '@/utils'

import styles from './VideoCard.module.css'

type TimeOptions = {
  relativeTime?: boolean
}

type Props = DetailedHTMLProps<
  HTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
> & {
  timeOptions?: TimeOptions
  value?: Video
}

const VideoCard: FC<Props> = ({ timeOptions, value, ...props }) => {
  const finished = !!value && !isZeroSeconds(parseDuration(value.duration))

  return (
    <a
      className={clsx('card', styles.video)}
      href={value?.url}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    >
      <div className={clsx('card__image', styles.image)}>
        {value ? (
          <>
            <Thumbnail id={value.id} />

            {finished ? (
              <Time
                className={clsx('badge', 'badge--info', styles.duration)}
                dateTime={value.duration}
                variant="duration"
              />
            ) : (
              <LiveStatus value={value} />
            )}
          </>
        ) : (
          <Skeleton className={styles.thumbnailSkeleton} variant="rect" />
        )}
      </div>

      <div className={clsx('card__body', styles.content)}>
        {value ? (
          <h4>{value.title}</h4>
        ) : (
          <h4>
            <Skeleton className={styles.titleSkeleton} variant="text" />
            <Skeleton className={styles.titleSkeleton} variant="text" />
          </h4>
        )}
      </div>

      <div className="card__footer">
        {value?.publishedAt ? (
          <Time
            className={styles.published}
            dateTime={value.publishedAt}
            variant={timeOptions?.relativeTime ? 'relative' : 'normal'}
          />
        ) : (
          <span className={styles.published}>
            <Skeleton variant="text" />
          </span>
        )}
      </div>
    </a>
  )
}

export default memo(
  VideoCard,
  (
    { timeOptions: previousTimeOptions, value: previousValue },
    { timeOptions: nextTimeOptions, value: nextValue }
  ) =>
    previousValue?.title === nextValue?.title &&
    previousValue?.publishedAt === nextValue?.publishedAt &&
    previousValue?.duration === nextValue?.duration &&
    previousTimeOptions?.relativeTime === nextTimeOptions?.relativeTime
)
