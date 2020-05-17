import clsx from 'clsx'
import swr, { useSWRPages } from 'swr'
import { GetServerSideProps, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import css from 'styled-jsx/css'

import SearchResponseBody from 'types/search-response-body'
import Spinner from 'components/atoms/spinner'
import VideoCard from 'components/molecules/video-card'
import { useSiteMetadata } from 'context/site-context'
import buildQueryString from 'utils/build-query-string'
import chunk from 'utils/chunk'
import getValue from 'utils/get-value'

const { className, styles } = css.resolve`
  .loading {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    margin: 2rem 0;
  }
`

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
  const { loadMore, pages } = useSWRPages<string | null, SearchResponseBody>(
    `search-page:${keyword}`,
    ({ offset, withSWR }) => {
      const queryString = buildQueryString({
        count: 9,
        q: keyword,
        until: offset
      })
      const apiURL = queryString ? `/api/search?${queryString}` : '/api/search'

      const { data: items } = withSWR(swr(apiURL))

      if (!items) {
        return (
          <div className={clsx('loading', className)}>
            <Spinner aria-label="読み込み中..." />
          </div>
        )
      }

      return chunk(items, 3).map((values) => (
        <div className="row" key={values.map((value) => value.id).join(':')}>
          {values.map((value) => (
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
          ))}
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
    if (!inView) return

    loadMore()
  }, [inView, loadMore])

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

      <div className="margin-top--lg">{pages}</div>

      <div className="padding-bottom--lg" ref={footerRef} />

      {styles}
    </>
  )
}

export default SearchPage
