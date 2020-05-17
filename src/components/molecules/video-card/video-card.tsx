import clsx from 'clsx'
import { format, isPast, parseJSON } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

import Duration from 'components/atoms/duration'
import RelativeTime from 'components/atoms/relative-time'
import YouTubeThumbnail from 'components/atoms/youtube-thumbnail'
import Video from 'types/video'
import parseDuration from 'utils/parse-duration'

import styles from './video-card.module.css'

const isFinished = (duration: Duration): boolean =>
  Object.values(duration).some((value) => value && value > 0)

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
  const timeLabel = format(publishedAt, 'PPPp', { locale: jaLocale })

  return (
    <a
      className={clsx('card', styles.video)}
      href={value.url}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    >
      <div className={clsx('card__image', styles.image)}>
        <YouTubeThumbnail id={value.id} />

        {isFinished(duration) ? (
          <Duration
            className={clsx('badge', 'badge--info', styles.duration)}
            dateTime={value.duration}
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
        {timeOptions?.relativeTime ? (
          <RelativeTime
            className={styles.published}
            dateTime={value.publishedAt}
            title={timeLabel}
          />
        ) : (
          <time
            className={styles.published}
            dateTime={value.publishedAt}
            title={timeLabel}
          >
            {format(publishedAt, 'p', { locale: jaLocale })}
          </time>
        )}
      </div>
    </a>
  )
}

export default VideoCard
