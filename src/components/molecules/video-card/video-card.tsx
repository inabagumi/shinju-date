import clsx from 'clsx'
import { format, parseJSON } from 'date-fns'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'
import css from 'styled-jsx/css'

import Duration from 'components/atoms/duration'
import RelativeTime from 'components/atoms/relative-time'
import YouTubeThumbnail from 'components/atoms/youtube-thumbnail'
import Video from 'types/video'
import parseDuration from 'utils/parse-duration'

const isPast = (duration: Duration): boolean =>
  (duration.seconds || 0) > 0 ||
  (duration.minutes || 0) > 0 ||
  (duration.hours || 0) > 0

const { className, styles } = css.resolve`
  .video__duration {
    bottom: 0.5em;
    position: absolute;
    right: 0.5em;
    background-color: rgba(0, 0, 0, 0.85);
    border-radius: 0.3em;
    color: #fff;
    display: inline-block;
    font-size: 0.8rem;
    font-weight: 500;
    line-height: 1;
    padding: 0.3em;
  }

  .video__published {
    color: var(--ifm-color-secondar);
    display: block;
    font-size: 0.85rem;
    text-align: right;
  }
`

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
    <>
      <a
        className="card video"
        href={value.url}
        rel="noopener noreferrer"
        target="_blank"
        {...props}
      >
        <div className="card__image video__image">
          <YouTubeThumbnail id={value.id} />

          {isPast(duration) && (
            <Duration
              className={clsx('video__duration', className)}
              dateTime={value.duration}
            />
          )}
        </div>

        <div className="card__body video__body">
          <h4>{value.title}</h4>
        </div>

        <div className="card__footer">
          {timeOptions?.relativeTime ? (
            <RelativeTime
              className={clsx('video__published', className)}
              dateTime={value.publishedAt}
              title={format(publishedAt, 'yyyy/MM/dd HH:mm:ss')}
            />
          ) : (
            <time
              className={clsx('video__published', className)}
              dateTime={value.publishedAt}
              title={format(publishedAt, 'yyyy/MM/dd HH:mm:ss')}
            >
              {format(publishedAt, 'HH:mm')}
            </time>
          )}
        </div>
      </a>

      <style jsx>{`
        .video {
          color: inherit;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .video:hover {
          text-decoration: none;
        }

        .video__image {
          position: relative;
        }

        .video__body {
          flex-grow: 1;
        }
      `}</style>

      {styles}
    </>
  )
}

export default VideoCard
