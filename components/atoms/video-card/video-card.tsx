import format from 'date-fns/format'
import React, { FC } from 'react'
import Video from '../../../types/video'

type Props = {
  value: Video
}

const VideoCard: FC<Props> = ({ value: { id, publishedAt, title, url } }) => {
  const thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
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
          align-items: center;
          display: flex;
          margin: 0 0 0.5rem;
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .thumbnail::before {
          content: '';
          display: block;
          padding-top: 56.25%; /* 9 / 16 */
        }

        .thumbnail img {
          display: block;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
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
        <div className="thumbnail">
          <img alt="" height="360" src={thumbnail} width="480" />
        </div>

        <h3 className="title">{title}</h3>

        <p className="published">
          <time dateTime={date.toISOString()}>
            {format(date, 'yyy/MM/dd HH:mm')}
          </time>
        </p>
      </a>
    </>
  )
}

export default VideoCard
