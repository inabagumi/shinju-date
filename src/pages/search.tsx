import clsx from 'clsx'
import chunk from 'lodash.chunk'
import { GetServerSideProps, NextPage } from 'next'
import Link from 'next/link'
import { NextSeo } from 'next-seo'
import React, { useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useSWRInfinite } from 'swr'
import { shareCard } from '@/assets'
import LinkButton from '@/components/atoms/LinkButton'
import Container from '@/components/atoms/Container'
import Grid, { Col, Row } from '@/components/molecules/Grid'
import SearchSkeleton from '@/components/molecules/SearchSkeleton'
import VideoCard from '@/components/molecules/VideoCard'
import { useSiteMetadata } from '@/context/SiteContext'
import styles from '@/styles/search.module.css'
import type { SearchResponseBody } from '@/types'
import { getValue } from '@/utils'

const SEARCH_RESULT_COUNT = 9

type Props = {
  keyword: string
}

export const getServerSideProps: GetServerSideProps<Props> = async ({
  query
  // eslint-disable-next-line @typescript-eslint/require-await
}) => {
  const keyword = getValue(query.q)

  return {
    props: {
      keyword
    }
  }
}

const SearchPage: NextPage<Props> = ({ keyword }) => {
  const { data, setSize } = useSWRInfinite<SearchResponseBody>(
    (index, previousPageData) => {
      if (previousPageData?.length === 0) return null

      const searchParams = new URLSearchParams({
        count: SEARCH_RESULT_COUNT.toString()
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
  const { baseURL, description, title: siteTitle } = useSiteMetadata()

  const loadMore = useCallback(
    () =>
      typeof setSize === 'function' ? setSize((x) => x + 1) : Promise.resolve(),
    [setSize]
  )

  const path = keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search'
  const title = keyword ? `『${keyword}』の検索結果` : '動画一覧'
  const items = data ? data?.flat() : []

  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd =
    isEmpty || (!!data && data[data.length - 1]?.length < SEARCH_RESULT_COUNT)

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
              url: new URL(shareCard, baseURL).toString(),
              width: 1200
            }
          ],
          type: 'website'
        }}
        title={[title, siteTitle].filter(Boolean).join(' - ')}
        twitter={{
          cardType: 'summary_large_image'
        }}
      />

      <Container>
        {!isEmpty ? (
          <div className="margin-top--lg">
            <h1 className={clsx('margin-bottom--lg', styles.searchResultsFor)}>
              {title}
            </h1>

            <InfiniteScroll
              dataLength={items.length}
              hasMore={!isReachingEnd}
              loader={<SearchSkeleton key={0} />}
              next={loadMore}
              scrollThreshold={0.9}
              style={{
                WebkitOverflowScrolling: undefined,
                height: undefined,
                overflow: undefined
              }}
            >
              <Grid>
                {chunk(items, 3).map((values) => (
                  <Row key={values.map((value) => value.id).join(':')}>
                    {values.map((value) => (
                      <Col
                        className="padding-bottom--lg padding-horiz--sm"
                        key={value.id}
                        size={4}
                      >
                        <VideoCard
                          timeOptions={{
                            relativeTime: true
                          }}
                          value={value}
                        />
                      </Col>
                    ))}
                  </Row>
                ))}
              </Grid>
            </InfiniteScroll>
          </div>
        ) : (
          <div className="text--center margin-bottom--lg margin-top--lg padding-bottom--lg padding-top--lg">
            <h1 className={styles.searchResultsFor}>検索結果はありません</h1>

            <p>
              『{keyword}
              』で検索しましたが一致する動画は見つかりませんでした。
            </p>

            <Link href="/search" passHref>
              <LinkButton color="primary" outline size="lg">
                新着動画を見る
              </LinkButton>
            </Link>
          </div>
        )}
      </Container>
    </>
  )
}

export default SearchPage
