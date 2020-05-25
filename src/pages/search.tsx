import swr, { useSWRPages } from '@ykzts/swr'
import { GetServerSideProps, NextPage } from 'next'
import Link from 'next/link'
import { NextSeo } from 'next-seo'
import React, { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

import { mainVisual } from '@/assets'
import LinkButton from '@/components/atoms/LinkButton'
import Container from '@/components/atoms/Container'
import Grid, { Col, Row } from '@/components/molecules/Grid'
import SearchSkeleton from '@/components/molecules/SearchSkeleton'
import VideoCard from '@/components/molecules/VideoCard'
import { useSiteMetadata } from '@/context/SiteContext'
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
  const { isEmpty, loadMore, pages } = useSWRPages<
    Date | null,
    SearchResponseBody
  >(
    `search-page:${keyword}`,
    ({ offset, withSWR }) => {
      const { data: items } = withSWR(
        swr(() => {
          const searchParams = new URLSearchParams({
            count: SEARCH_RESULT_COUNT.toString(),
            q: keyword
          })

          if (offset) searchParams.set('until', offset.toJSON())

          return `/api/search?${searchParams.toString()}`
        })
      )

      if (!items) {
        return <SearchSkeleton />
      }

      return chunk(items, 3).map((values) => (
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
      ))
    },
    ({ data: items = [] }) =>
      items.length >= SEARCH_RESULT_COUNT
        ? items[items.length - 1].publishedAt
        : null,
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
              url: new URL(mainVisual, baseURL).toString(),
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

      <Container>
        {!isEmpty ? (
          <div className="margin-top--lg">
            <Grid>{pages}</Grid>
          </div>
        ) : (
          <div className="text--center margin-bottom--lg margin-top--lg padding-bottom--lg padding-top--lg">
            <h2>検索結果はありません</h2>
            <p>
              『{keyword}』で検索しましたが一致する動画は見つかりませんでした。
            </p>

            <Link href="/search" passHref>
              <LinkButton color="primary" outline size="lg">
                新着動画を見る
              </LinkButton>
            </Link>
          </div>
        )}

        <div className="padding-bottom--lg" ref={footerRef} />
      </Container>
    </>
  )
}

export default SearchPage
