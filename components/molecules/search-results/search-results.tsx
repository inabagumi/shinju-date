import React, { FC } from 'react'
import Video from '../../../types/video'
import VideoCard from '../../atoms/video-card'

interface Props {
  values: Video[]
}

const SearchResults: FC<Props> = ({ values }) => {
  return (
    <>
      <div className="search-results">
        <div className="search-results__list" role="feed">
          {values.map((value, index) => (
            <VideoCard
              aria-posinset={index + 1}
              aria-setsize={values.length}
              key={index}
              value={value}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .search-results {
          margin: 0 auto;
          max-width: 1024px;
          padding: 1rem 0.5rem 0.5rem;
        }

        .search-results__list {
          box-sizing: border-box;
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        }
      `}</style>
    </>
  )
}

export default SearchResults
