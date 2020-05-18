import clsx from 'clsx'
import { isPast, parseJSON } from 'date-fns'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

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
  value: Video
}

const VideoCard: FC<Props> = ({ timeOptions, value, ...props }) => {
  const publishedAt = parseJSON(value.publishedAt)
  const duration = parseDuration(value.duration)

  return (
    <a
      className={clsx('card', styles.video)}
      href={value.url}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    >
      <div className={clsx('card__image', styles.image)}>
        <Thumbnail id={value.id} />

        {!isZeroSeconds(duration) ? (
          <Time
            className={clsx('badge', 'badge--info', styles.duration)}
            dateTime={value.duration}
            variant="duration"
          />
        ) : isPast(publishedAt) ? (
          <span className={clsx('badge', 'badge--info', styles.liveNow)}>
            ライブ配信中
          </span>
        ) : null}
      </div>

      <div className={clsx('card__body', styles.content)}>
        <h4>{value.title}</h4>
      </div>

      <div className="card__footer">
        <Time
          className={styles.published}
          dateTime={value.publishedAt}
          variant={timeOptions?.relativeTime ? 'relative' : 'normal'}
        />
      </div>
    </a>
  )
}

export default VideoCard
