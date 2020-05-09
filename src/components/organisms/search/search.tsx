import classNames from 'classnames'
import React, { FC, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import swr, { useSWRPages } from 'swr'

import Video from 'types/video'
import Spinner from 'components/atoms/spinner'
import VideoCard from 'components/molecules/video-card'

const SEARCH_INITIAL_COUNT = 18
const SEARCH_COLUMNS_COUNT = 3

type Params = {
  count?: number | null
  q?: string | null
  until?: string | null
}

const buildQueryString = (params: Params): string => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.append(key, value.toString())
    }
  }

  return searchParams.toString()
}

type Props = {
  query?: string
}

const Search: FC<Props> = ({ query }) => {
  const { isLoadingMore, isReachingEnd, loadMore, pages } = useSWRPages<
    string | null,
    Video[]
  >(
    `search-page:${query}`,
    ({ offset, withSWR }) => {
      const queryString = buildQueryString({
        count: SEARCH_INITIAL_COUNT,
        q: query,
        until: offset
      })
      const url = queryString ? `/api/search?${queryString}` : '/api/search'

      const { data: items } = withSWR(swr<Video[]>(url))

      if (!items) return null

      return items.map((value) => (
        <div
          className={classNames(
            'col',
            `col--${12 / SEARCH_COLUMNS_COUNT}`,
            'padding-bottom--lg',
            'padding-horiz--sm'
          )}
          key={value.id}
        >
          <VideoCard value={value} />
        </div>
      ))
    },
    ({ data: items }) =>
      items && items.length > 0 ? items[items.length - 1].publishedAt : null,
    [query]
  )
  const [footerRef, inView] = useInView()

  useEffect(() => {
    if (!inView || isReachingEnd || isLoadingMore) return

    loadMore()
  }, [inView, isReachingEnd, isLoadingMore, loadMore])

  return (
    <>
      <div className="margin-top--lg">
        <div className="row">{pages}</div>
      </div>

      {!isReachingEnd && (
        <div className="search__footer" ref={footerRef}>
          {isLoadingMore && (
            <div className="search__loading">
              <Spinner aria-label="読み込み中..." />
            </div>
          )}
        </div>
      )}

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
