import React, { FC } from 'react'

type Props = {
  id: string
}

const YouTubeThumbnail: FC<Props> = ({ id }) => (
  <>
    <div className="thumbnail">
      <img
        alt=""
        className="thumbnail__image"
        loading="lazy"
        sizes="(min-width: 500px) 320px, 480px"
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        srcSet={`https://i.ytimg.com/vi/${id}/mqdefault.jpg 320w, https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
      />
    </div>

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

export default YouTubeThumbnail
