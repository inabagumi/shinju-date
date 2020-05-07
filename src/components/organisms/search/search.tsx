import classNames from 'classnames'
import React, { FC, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import swr, { useSWRPages } from 'swr'

import Video from 'types/video'
import Spinner from 'components/atoms/spinner'
import VideoCard from 'components/molecules/video-card'

const COLUMNS_COUNT = 3

type Props = {
  query: string
}

const Search: FC<Props> = ({ query }) => {
  const response = useSWRPages<string | null, Video[]>(
    'search-page',
    ({ offset, withSWR }) => {
      const searchParams = new URLSearchParams()
      if (query) searchParams.append('q', query)
      if (offset) searchParams.append('until', offset)

      const queryString = searchParams.toString()

      const { data: items } = withSWR(
        swr<Video[]>(`/api/search${queryString ? `?${queryString}` : ''}`)
      )

      if (!items) return null

      return items.map((value) => {
        const className = classNames(
          'col',
          `col--${12 / COLUMNS_COUNT}`,
          'padding-bottom--lg',
          'padding-horiz--sm'
        )

        return (
          <div className={className} key={value.id}>
            <VideoCard value={value} />
          </div>
        )
      })
    },
    ({ data: items }) =>
      items && items.length > 0 ? items[items.length - 1].publishedAt : null,
    [query]
  )
  const [footerRef, inView] = useInView()

  const { isLoadingMore, isReachingEnd, loadMore, pages } = response

  useEffect(() => {
    if (!inView || isReachingEnd || isLoadingMore) return

    loadMore()
  }, [inView, isReachingEnd, isLoadingMore, loadMore])

  return (
    <>
      <div className="margin-top--lg">
        <div className="row">{pages}</div>
      </div>

      <div className="search__footer" ref={footerRef}>
        {isLoadingMore && (
          <div className="search__loading">
            <Spinner aria-label="読み込み中..." />
          </div>
        )}
      </div>

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
