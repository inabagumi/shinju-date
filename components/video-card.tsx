import format from 'date-fns/format'
import React, { FC } from 'react'
import Video from '../types/video'

type Props = {
  value: Video
}

const VideoCard: FC<Props> = ({
  value: { channel, id, publishedAt, title, url }
}) => {
  const thumbnail = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
  const date = new Date(publishedAt * 1000)

  return (
    <>
      <style jsx>{`
        .card {
          border-radius: 4px;
          box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.1),
            0 1px 3px 1px rgba(0, 0, 0, 0.2);
          color: inherit;
          display: flex;
          flex-direction: column;
          margin: 0 0.5rem 2rem;
          overflow: hidden;
          text-decoration: none;
        }

        .thumbnail {
          display: block;
          height: auto;
          margin: 0 0 0.5rem;
          width: 100%;
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

      <a className="card" href={url} rel="noopener noreferrer" target="_blank">
        <img
          alt=""
          className="thumbnail"
          height="720"
          src={thumbnail}
          width="1280"
        />

        <h3 className="title">{title}</h3>

        <p className="published">
          <time dateTime={date.toISOString()}>
            {format(date, 'yyy/MM/dd hh:mm')}
          </time>
        </p>
      </a>
    </>
  )
}

export default VideoCard
