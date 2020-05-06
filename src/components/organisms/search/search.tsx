import classNames from 'classnames'
import React, { FC, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { useSWRPages } from 'swr'

import Video from 'types/video'
import Spinner from 'components/atoms/spinner'
import VideoCard from 'components/molecules/video-card'
import { useSearch as search } from 'search'

const COLUMNS_COUNT = 3

interface Props {
  query: string
}

const Search: FC<Props> = ({ query }) => {
  const { isLoadingMore, isReachingEnd, loadMore, pages } = useSWRPages(
    'search-page',
    ({ offset: page, withSWR }) => {
      const { data: items } = withSWR(
        search<Video>(query, { page: page || 0 })
      )

      if (!items) return null

      return (items as Video[]).map((value) => {
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
      })
    },
    ({ data: items }: { data?: Video[] }, index): number | null =>
      (items?.length || 0) > 0 ? index + 1 : null,
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
