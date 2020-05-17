import clsx from 'clsx'
import { format, parseJSON } from 'date-fns'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

import Duration from 'components/atoms/duration'
import RelativeTime from 'components/atoms/relative-time'
import YouTubeThumbnail from 'components/atoms/youtube-thumbnail'
import Video from 'types/video'
import parseDuration from 'utils/parse-duration'

import styles from './video-card.module.css'

const isPast = (duration: Duration): boolean =>
  (duration.seconds || 0) > 0 ||
  (duration.minutes || 0) > 0 ||
  (duration.hours || 0) > 0

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
        <YouTubeThumbnail id={value.id} />

        {isPast(duration) && (
          <Duration className={styles.duration} dateTime={value.duration} />
        )}
      </div>

      <div className={clsx('card__body', styles.content)}>
        <h4>{value.title}</h4>
      </div>

      <div className="card__footer">
        {timeOptions?.relativeTime ? (
          <RelativeTime
            className={styles.published}
            dateTime={value.publishedAt}
            title={format(publishedAt, 'yyyy/MM/dd HH:mm:ss')}
          />
        ) : (
          <time
            className={styles.published}
            dateTime={value.publishedAt}
            title={format(publishedAt, 'yyyy/MM/dd HH:mm:ss')}
          >
            {format(publishedAt, 'HH:mm')}
          </time>
        )}
      </div>
    </a>
  )
}

export default VideoCard
