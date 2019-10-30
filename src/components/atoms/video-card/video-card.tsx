import dynamic from 'next/dynamic'
import React, {
  DetailedHTMLProps,
  FC,
  HTMLAttributes,
  ReactElement
} from 'react'
import Video from '../../../types/video'
import YouTubeThumbnail from '../youtube-thumbnail'

const Time = dynamic(() => import('../time'), {
  ssr: false
})

type Props = DetailedHTMLProps<
  HTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
> & {
  value: Video
}

const VideoCard: FC<Props> = ({
  value: { id, publishedAt, title, url },
  ...props
}): ReactElement => {
  const date = new Date(publishedAt * 1000)

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
            &nbsp;
            <Time date={date} />
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
