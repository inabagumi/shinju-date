import clsx from 'clsx'
import { formatISODuration, isEqual } from 'date-fns'
import React, { AnchorHTMLAttributes, DetailedHTMLProps, FC, memo } from 'react'

import Badge from '@/components/atoms/Badge'
import LiveStatus from '@/components/atoms/LiveStatus'
import Skeleton from '@/components/atoms/Skeleton'
import Time from '@/components/atoms/Time'
import Thumbnail from '@/components/atoms/Thumbnail'
import type { Video } from '@/types'

import styles from './VideoCard.module.css'

type TimeOptions = {
  relativeTime?: boolean
}

type BaseProps = DetailedHTMLProps<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

type Props = BaseProps & {
  timeOptions?: TimeOptions
  value?: Video
}

const VideoCard: FC<Props> = ({ timeOptions, value, ...props }) => (
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

          {value?.duration ? (
            <Badge className={styles.duration}>
              <Time
                dateTime={formatISODuration(value.duration)}
                variant="duration"
              />
            </Badge>
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
          dateTime={value.publishedAt.toJSON()}
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

export default memo(
  VideoCard,
  (
    { timeOptions: previousTimeOptions, value: previousValue },
    { timeOptions: nextTimeOptions, value: nextValue }
  ) =>
    previousValue?.title === nextValue?.title &&
    isEqual(previousValue?.publishedAt || 0, nextValue?.publishedAt || 0) &&
    previousValue?.duration?.seconds === nextValue?.duration?.seconds &&
    previousValue?.duration?.minutes === nextValue?.duration?.minutes &&
    previousValue?.duration?.hours === nextValue?.duration?.hours &&
    previousTimeOptions?.relativeTime === nextTimeOptions?.relativeTime
)
