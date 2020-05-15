import { format, parseJSON } from 'date-fns'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'
import css from 'styled-jsx/css'

import Duration from 'components/atoms/duration'
import RelativeTime from 'components/atoms/relative-time'
import YouTubeThumbnail from 'components/atoms/youtube-thumbnail'
import Video from 'types/video'

const { className: durationClassName, styles: durationStyles } = css.resolve`
  span {
    bottom: 0.5em;
    position: absolute;
    right: 0.5em;
  }
`

type Props = DetailedHTMLProps<
  HTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
> & {
  absolute?: boolean
  value: Video
}

const VideoCard: FC<Props> = ({ absolute, value, ...props }) => {
  const publishedAt = parseJSON(value.publishedAt)
  const hasDuration =
    (value.duration.seconds || 0) > 0 ||
    (value.duration.minutes || 0) > 0 ||
    (value.duration.hours || 0) > 0

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

          {hasDuration && (
            <Duration className={durationClassName} value={value.duration} />
          )}
        </div>

        <div className="card__body video__body">
          <h4>{value.title}</h4>
        </div>

        <div className="card__footer">
          <small className="video__published">
            &nbsp;
            {absolute ? (
              <time dateTime={publishedAt.toJSON()}>
                {format(publishedAt, 'HH:mm')}
              </time>
            ) : (
              <RelativeTime date={publishedAt} />
            )}
          </small>
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

        .video__published {
          color: var(--ifm-color-secondar);
          display: block;
          text-align: right;
        }
      `}</style>

      {durationStyles}
    </>
  )
}

export default VideoCard
