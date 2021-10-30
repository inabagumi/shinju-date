import clsx from 'clsx'
import chunk from 'lodash.chunk'
import { NextSeo } from 'next-seo'
import { useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import useSWRInfinite from 'swr/infinite'
import shareCard from '../assets/share-card.jpg'
import VideoCard from '../components/video-card'
import Page from '../components/layout'
import Link from '../components/link'
import styles from '../styles/search.module.css'
import getValue from '../utils/getValue'
import type { GetServerSideProps, NextPage } from 'next'
import type SearchResponseBody from '../types/SearchResponseBody'

const SEARCH_RESULT_COUNT = 9

type Props = {
  keyword: string
}

const SearchPage: NextPage<Props> = ({ keyword }) => {
  const { data, setSize } = useSWRInfinite<SearchResponseBody>(
    (index, previousPageData) => {
      if (previousPageData?.length === 0) return null

      const searchParams = new URLSearchParams({
        count: `${SEARCH_RESULT_COUNT}`
      })

      if (keyword) searchParams.set('q', keyword)

      const offset =
        previousPageData?.[previousPageData.length - 1]?.publishedAt

      if (index > 0 && offset) {
        searchParams.set('until', offset.toJSON())
      }

      return `/api/search?${searchParams.toString()}`
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  )

  const loadMore = useCallback(
    () =>
      typeof setSize === 'function' ? setSize((x) => x + 1) : Promise.resolve(),
    [setSize]
  )

  const baseURL = process.env.NEXT_PUBLIC_BASE_URL
  const path = keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search'
  const title = keyword ? `『${keyword}』の検索結果` : '動画一覧'
  const description = process.env.NEXT_PUBLIC_DESCRIPTION
  const items = data ? data?.flat() : []

  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd =
    isEmpty || (!!data && data[data.length - 1]?.length < SEARCH_RESULT_COUNT)
  const placeholder = (
    <div className="row" key={0}>
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCard />
      </div>
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCard />
      </div>
      <div className="col col--4" />
    </div>
  )

  return (
    <>
      <NextSeo
        canonical={new URL(path, baseURL).toString()}
        description={description}
        noindex
        openGraph={{
          images: [
            {
              height: shareCard.height,
              url: new URL(shareCard.src, baseURL).toString(),
              width: shareCard.width
            }
          ],
          type: 'website'
        }}
        title={title}
        twitter={{
          cardType: 'summary_large_image'
        }}
      />

      <Page>
        <div className="container">
          {!isEmpty ? (
            <div className="margin-top--lg">
              <h1
                className={clsx('margin-bottom--lg', styles.searchResultsFor)}
              >
                {title}
              </h1>

              <InfiniteScroll
                dataLength={items.length}
                hasMore={!isReachingEnd}
                loader={placeholder}
                next={loadMore}
                scrollThreshold={0.9}
                style={{
                  WebkitOverflowScrolling: undefined,
                  height: undefined,
                  overflow: undefined
                }}
              >
                <div className="container">
                  {chunk(items, 3).map((values) => (
                    <div
                      className="row"
                      key={values.map((value) => value.id).join(':')}
                    >
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
                      {new Array(3 - values.length).fill(
                        <div className="col col--4" />
                      )}
                    </div>
                  ))}
                </div>
              </InfiniteScroll>
            </div>
          ) : (
            <div className="text--center margin-bottom--lg margin-top--lg padding-bottom--lg padding-top--lg">
              <h1 className={styles.searchResultsFor}>検索結果はありません</h1>

              <p>
                『{keyword}
                』で検索しましたが一致する動画は見つかりませんでした。
              </p>

              <Link
                className="button button--lg button--outline button--primary"
                href="/search"
                role="button"
              >
                新着動画を見る
              </Link>
            </div>
          )}
        </div>
      </Page>
    </>
  )
}

export default SearchPage

export const getServerSideProps: GetServerSideProps<Props> = ({ query }) => {
  const keyword = getValue(query.q)

  return Promise.resolve({
    props: {
      keyword
    }
  })
}
