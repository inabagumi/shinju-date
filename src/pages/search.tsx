import clsx from 'clsx'
import { GetServerSideProps, NextPage } from 'next'
import Link from 'next/link'
import { NextSeo } from 'next-seo'
import React, { useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useSWRInfinite } from 'swr'

import { mainVisual } from '@/assets'
import LinkButton from '@/components/atoms/LinkButton'
import Container from '@/components/atoms/Container'
import Grid, { Col, Row } from '@/components/molecules/Grid'
import SearchSkeleton from '@/components/molecules/SearchSkeleton'
import VideoCard from '@/components/molecules/VideoCard'
import { useSiteMetadata } from '@/context/SiteContext'
import styles from '@/styles/search.module.css'
import type { SearchResponseBody } from '@/types'
import { chunk, getValue } from '@/utils'

const SEARCH_RESULT_COUNT = 9

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
  const { data, setPage } = useSWRInfinite<SearchResponseBody>(
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
    () => setPage?.((x) => x + 1) || Promise.resolve(),
    [setPage]
  )

  const path = keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search'
  const title = keyword ? `『${keyword}』の検索結果` : '動画一覧'
  const items = data ? data?.flat() : []

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
              url: new URL(mainVisual, baseURL).toString(),
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
        {data?.[0]?.length !== 0 ? (
          <div className="margin-top--lg">
            <h1 className={clsx('margin-bottom--lg', styles.searchResultsFor)}>
              {title}
            </h1>

            <InfiniteScroll
              dataLength={items.length}
              hasMore={(data?.[data.length - 1]?.length || 0) > 0}
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
