import formatDistanceStrict from 'date-fns/formatDistanceStrict'
import ja from 'date-fns/locale/ja'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'
import Video from '../../../types/video'
import YouTubeThumbnail from '../youtube-thumbnail'

export interface VideoCardProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  value: Video
}

const VideoCard: FC<VideoCardProps> = ({
  value: { id, publishedAt, title, url },
  ...props
}) => {
  const date = new Date(publishedAt * 1000)

  return (
    <>
      <article className="card" {...props}>
        <div className="card__thumbnail">
          <a
            aria-label={title}
            className="card__link"
            href={url}
            rel="noopener noreferrer"
            tabIndex={-1}
            target="_blank"
          >
            <YouTubeThumbnail id={id} />
          </a>
        </div>

        <h3 className="card__title">
          <a
            className="card__link"
            href={url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {title}
          </a>
        </h3>

        <p className="card__published">
          <a
            aria-label={title}
            className="card__link"
            href={url}
            rel="noopener noreferrer"
            tabIndex={-1}
            target="_blank"
          >
            <time dateTime={date.toISOString()}>
              {formatDistanceStrict(date, new Date(), {
                addSuffix: true,
                locale: ja
              })}
            </time>
          </a>
        </p>
      </article>

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

        .card__link {
          color: inherit;
          display: block;
          text-decoration: none;
        }

        .card__thumbnail .card__link {
          padding: 0 0 0.5rem;
        }

        .card__title {
          flex-grow: 1;
          font-size: 0.9rem;
          font-weight: 700;
          line-height: 1.5;
          margin: 0;
        }

        .card__title .card__link {
          box-sizing: border-box;
          height: 100%;
          padding: 0 0.5rem;
        }

        .card__published {
          font-size: 0.8rem;
          margin: 0;
          text-align: right;
        }

        .card__published .card__link {
          padding: 0.5rem 0.5rem 0.5rem;
        }
      `}</style>
    </>
  )
}

export default VideoCard
