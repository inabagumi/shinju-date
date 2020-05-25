import useSWR from '@ykzts/swr'
import { startOfHour, subHours } from 'date-fns'
import { NextPage } from 'next'
import Link from 'next/link'
import { NextSeo } from 'next-seo'
import React from 'react'

import { mainVisual } from '@/assets'
import Container from '@/components/atoms/Container'
import Timeline from '@/components/organisms/Timeline'
import { useSiteMetadata } from '@/context/SiteContext'
import type { SearchResponseBody } from '@/types'

const getRequestURL = (now = new Date()): string => {
  const hours = startOfHour(now)
  const since = subHours(hours, 2)
  const searchParams = new URLSearchParams({
    count: '100',
    since: since.toJSON()
  })

  return `/api/search?${searchParams.toString()}`
}

const IndexPage: NextPage = () => {
  const { data: items } = useSWR<SearchResponseBody>(() => getRequestURL())
  const { baseURL, description, title } = useSiteMetadata()

  return (
    <>
      <NextSeo
        canonical={`${baseURL}/`}
        description={description}
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

      <Container className="margin-bottom--lg">
        <Timeline values={items} />

        {items && (
          <nav className="text--right">
            <Link href="/search">
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a rel="next">もっと見る »</a>
            </Link>
          </nav>
        )}
      </Container>
    </>
  )
}

export default IndexPage
