import swr, { useSWRPages } from 'swr'
import { GetServerSideProps, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

import Video from 'types/video'
import Spinner from 'components/atoms/spinner'
import VideoCard from 'components/molecules/video-card'
import { useSiteMetadata } from 'context/site-context'
import buildQueryString from 'utils/build-query-string'
import getValue from 'utils/get-value'

const SEARCH_INITIAL_COUNT = 18

type Props = {
  keyword: string
}

export const getServerSideProps: GetServerSideProps<Props> = async ({
  query
}) => {
  const keyword = getValue(query.q)

  return {
    props: {
      keyword
    }
  }
}

const SearchPage: NextPage<Props> = ({ keyword }) => {
  const { isLoadingMore, isReachingEnd, loadMore, pages } = useSWRPages<
    string | null,
    Video[]
  >(
    `search-page:${keyword}`,
    ({ offset, withSWR }) => {
      const queryString = buildQueryString({
        count: SEARCH_INITIAL_COUNT,
        q: keyword,
        until: offset
      })
      const apiURL = queryString ? `/api/search?${queryString}` : '/api/search'

      const { data: items } = withSWR(swr<Video[]>(apiURL))

      if (!items) return null

      return items.map((value) => (
        <div
          className="col col--4 padding-bottom--lg padding-horiz--sm"
          key={value.id}
        >
          <VideoCard
            timeOptions={{
              relativeTime: true
            }}
            value={value}
          />
        </div>
      ))
    },
    ({ data: items }) =>
      items && items.length > 0 ? items[items.length - 1].publishedAt : null,
    [keyword]
  )
  const [footerRef, inView] = useInView()
  const { baseURL, description, title: siteTitle } = useSiteMetadata()

  useEffect(() => {
    if (!inView || isReachingEnd || isLoadingMore) return

    loadMore()
  }, [inView, isReachingEnd, isLoadingMore, loadMore])

  const path = keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search'
  const title = [keyword, siteTitle].filter(Boolean).join(' - ')

  return (
    <>
      <NextSeo
        canonical={`${baseURL}${path}`}
        description={description}
        noindex
        openGraph={{
          images: [
            {
              height: 630,
              url: `${baseURL}/main-visual.jpg`,
              width: 1200
            }
          ],
          type: 'website'
        }}
        title={title}
        twitter={{
          cardType: 'summary_large_image'
        }}
      />

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

export default SearchPage
