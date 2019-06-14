import React, { FC } from 'react'
import Video from '../../../types/video'
import VideoCard from '../../atoms/video-card'

interface Props {
  values: Video[]
}

const SearchResults: FC<Props> = ({ values }) => {
  return (
    <>
      <div className="results" role="feed">
        {values.map((video, i) => (
          <VideoCard
            aria-posinset={i + 1}
            aria-setsize={values.length}
            key={video.id}
            value={video}
          />
        ))}
      </div>

      {values.length < 1 && (
        <div className="notfound">
          <p>検索結果がありません</p>
        </div>
      )}

      <style jsx>{`
        .results {
          box-sizing: border-box;
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          margin: 1rem auto;
          max-width: 1200px;
          padding: 0 0.5rem;
        }

        .notfound {
          margin: 1rem;
        }

        .notfound p {
          font-size: 1rem;
          line-height: 1.5;
          margin: 10rem 0;
          padding: 0 0.5rem;
          text-align: center;
        }
      `}</style>
    </>
  )
}

export default SearchResults
