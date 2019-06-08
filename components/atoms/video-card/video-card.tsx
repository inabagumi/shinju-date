import format from 'date-fns/format'
import React, { AriaAttributes, FC } from 'react'
import Video from '../../../types/video'
import YouTubeThumbnail from '../youtube-thumbnail'

interface Props extends AriaAttributes {
  value: Video
}

const VideoCard: FC<Props> = ({
  value: { id, publishedAt, title, url },
  ...props
}) => {
  const date = new Date(publishedAt * 1000)

  return (
    <>
      <a
        className="card"
        href={url}
        rel="noopener noreferrer"
        role="article"
        target="_blank"
        {...props}
      >
        <YouTubeThumbnail id={id} />

        <h3 className="title">{title}</h3>

        <p className="published">
          <time dateTime={date.toISOString()}>
            {format(date, 'yyy/MM/dd HH:mm')}
          </time>
        </p>
      </a>

      <style jsx>{`
        .card {
          border-radius: 4px;
          box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.1),
            0 1px 3px 1px rgba(0, 0, 0, 0.2);
          color: inherit;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          text-decoration: none;
        }

        .title {
          flex-grow: 1;
          font-size: 0.9rem;
          font-weight: 700;
          line-height: 1.5;
          margin: 0 0.5rem;
        }

        .published {
          font-size: 0.8rem;
          margin: 0.5rem 0.5rem 0.5rem;
          text-align: right;
        }
      `}</style>
    </>
  )
}

export default VideoCard
