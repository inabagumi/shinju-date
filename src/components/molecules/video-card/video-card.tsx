import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'
import css from 'styled-jsx/css'
import { parse as parseDuration } from '../../../time/duration'
import Video from '../../../types/video'
import Duration from '../../atoms/duration'
import Time from '../../atoms/time'
import YouTubeThumbnail from '../../atoms/youtube-thumbnail'

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
  value: Video
}

const VideoCard: FC<Props> = ({ value, ...props }) => {
  const date = new Date(value.publishedAt * 1000)
  const duration = parseDuration(value.duration || 'PT0S')
  const hasDuration =
    duration.seconds > 0 || duration.minutes > 0 || duration.hours > 0

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
            <Duration className={durationClassName} value={duration} />
          )}
        </div>

        <div className="card__body video__body">
          <h4>{value.title}</h4>
        </div>

        <div className="card__footer">
          <small className="video__published">
            &nbsp;
            <Time date={date} />
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
