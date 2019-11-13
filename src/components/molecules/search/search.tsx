import classNames from 'classnames'
import chunk from 'lodash/chunk'
import React, { FC, useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import useSearch from '../../../hooks/use-search'
import Video from '../../../types/video'
import Spinner from '../../atoms/spinner'
import VideoCard from '../../atoms/video-card'

const COLUMNS_COUNT = 3

interface Props {
  query: string
}

const Search: FC<Props> = ({ query }): JSX.Element => {
  const [page, setPage] = useState(0)
  const { hasNext, isLoading, items } = useSearch<Video>(query, page)
  const [loadingRef, inView] = useInView()

  useEffect(() => {
    setPage(0)
  }, [query])

  useEffect(() => {
    if (!inView || isLoading) return

    setPage(page => page + 1)
  }, [inView, isLoading])

  return (
    <>
      <div className="margin-top--lg">
        {chunk(items, COLUMNS_COUNT).map<JSX.Element>((row, i) => (
          <div className="row" key={`row-${i}`}>
            {row.map<JSX.Element>(value => {
              const className = classNames(
                'col',
                `col--${12 / COLUMNS_COUNT}`,
                'padding-bottom--lg',
                'padding-horiz--sm'
              )

              return (
                <div className={className} key={value.url}>
                  <VideoCard value={value} />
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <footer className="search__footer">
        {hasNext && (
          <div className="search__loading" ref={loadingRef}>
            <Spinner aria-label="読み込み中..." />
          </div>
        )}
      </footer>

      <style jsx>{`
        .search__footer {
          padding: 2rem 0;
        }

        .search__loading {
          align-items: center;
          display: flex;
          height: 100%;
          justify-content: center;
        }
      `}</style>
    </>
  )
}

export default Search
