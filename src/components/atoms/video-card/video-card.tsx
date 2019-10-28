import formatDistanceStrict from 'date-fns/formatDistanceStrict'
import ja from 'date-fns/locale/ja'
import format from 'date-fns-tz/format'
import toDate from 'date-fns-tz/toDate'
import React, {
  DetailedHTMLProps,
  FC,
  HTMLAttributes,
  ReactElement
} from 'react'
import Video from '../../../types/video'
import YouTubeThumbnail from '../youtube-thumbnail'

export interface VideoCardProps
  extends DetailedHTMLProps<
    HTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  > {
  value: Video
}

const VideoCard: FC<VideoCardProps> = ({
  value: { id, publishedAt, title, url },
  ...props
}): ReactElement => {
  const date = toDate(publishedAt * 1000, { timeZone: 'UTC' })

  return (
    <>
      <a
        className="card"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
        {...props}
      >
        <div className="card__image">
          <YouTubeThumbnail id={id} />
        </div>

        <div className="card__body">
          <h4>{title}</h4>
        </div>

        <div className="card__footer">
          <small className="published">
            <time
              dateTime={date.toISOString()}
              title={format(date, 'yyy/MM/dd HH:mm', {
                timeZone: 'Asia/Tokyo'
              })}
            >
              {formatDistanceStrict(date, new Date(), {
                addSuffix: true,
                locale: ja
              })}
            </time>
          </small>
        </div>
      </a>

      <style jsx>{`
        .card {
          color: inherit;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .card:hover {
          text-decoration: none;
        }

        .card__body {
          flex-grow: 1;
        }

        .published {
          color: var(--ifm-color-secondar);
          display: block;
          text-align: right;
        }
      `}</style>
    </>
  )
}

export default VideoCard
