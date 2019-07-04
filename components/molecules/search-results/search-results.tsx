import React, { FC, useCallback, useState, useEffect } from 'react'
import List from 'react-list'
import Video from '../../../types/video'
import VideoCard from '../../atoms/video-card'

interface Props {
  values: Video[]
}

const SearchResults: FC<Props> = ({ values }) => {
  const [minSize, setMinSize] = useState<number>(20)

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

  useEffect(() => {
    setMinSize(8)
  }, [])

  return (
    <>
      <div className="search-results">
        <List
          itemRenderer={renderItem}
          itemsRenderer={renderItems}
          length={values.length}
          minSize={minSize}
          type="uniform"
          useTranslate3d
        />
      </div>

      <style jsx>{`
        .search-results {
          margin: 0 auto;
          max-width: 1024px;
          padding: 1rem 0.5rem 0.5rem;
        }

        .search-results :global(.search-results__list) {
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
