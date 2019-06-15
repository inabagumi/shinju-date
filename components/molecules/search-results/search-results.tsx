import React, { FC, useCallback } from 'react'
import List from 'react-list'
import Video from '../../../types/video'
import VideoCard from '../../atoms/video-card'

interface Props {
  values: Video[]
}

const SearchResults: FC<Props> = ({ values }) => {
  const renderItem = useCallback(
    (index, key) => (
      <VideoCard
        aria-posinset={index + 1}
        aria-setsize={values.length}
        key={key}
        value={values[index]}
      />
    ),
    [values]
  )

  const renderItems = useCallback(
    (items, ref) => (
      <div className="search-results__list" ref={ref} role="feed">
        {items}
      </div>
    ),
    []
  )

  return (
    <>
      <div className="search-results">
        <List
          itemRenderer={renderItem}
          itemsRenderer={renderItems}
          length={values.length}
          minSize={12}
          type="uniform"
        />
      </div>

      <style jsx>{`
        .search-results :global(.search-results__list) {
          box-sizing: border-box;
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          margin: 1rem auto;
          max-width: 1200px;
          padding: 0 0.5rem;
        }
      `}</style>
    </>
  )
}

export default SearchResults
