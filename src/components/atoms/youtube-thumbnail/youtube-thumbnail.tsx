import React, { FC, ReactElement } from 'react'

export interface YouTubeThumbnailProps {
  id: string
}

const YouTubeThumbnail: FC<YouTubeThumbnailProps> = ({ id }): ReactElement => {
  return (
    <>
      <picture className="thumbnail">
        <source
          media="(min-width: 500px)"
          srcSet={`https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`}
          type="image/webp"
        />
        <source
          srcSet={`https://i.ytimg.com/vi_webp/${id}/hqdefault.webp`}
          type="image/webp"
        />
        <source
          media="(min-width: 500px)"
          srcSet={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
          type="image/jpeg"
        />

        <img
          alt=""
          className="thumbnail__image"
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        />
      </picture>

      <style jsx>{`
        .thumbnail {
          align-items: center;
          background-color: #424242;
          display: flex;
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .thumbnail::before {
          content: '';
          display: block;
          padding-top: 56.25%;
        }

        .thumbnail__image {
          display: block;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          width: 100%;
        }
      `}</style>
    </>
  )
}

export default YouTubeThumbnail
