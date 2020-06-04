import useSWR from '@ykzts/swr'
import clsx from 'clsx'
import { startOfHour, subHours } from 'date-fns'
import { NextPage } from 'next'
import Link from 'next/link'
import { NextSeo } from 'next-seo'
import React from 'react'

import { Logo, mainVisual } from '@/assets'
import LinkButton from '@/components/atoms/LinkButton'
import Container from '@/components/atoms/Container'
import Hero, { HeroTitle } from '@/components/organisms/Hero'
import Timeline from '@/components/organisms/Timeline'
import { useSiteMetadata } from '@/context/SiteContext'
import styles from '@/styles/home.module.css'
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
  const { data: items } = useSWR<SearchResponseBody>(() => getRequestURL(), {
    refreshInterval: 10 * 1000
  })
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

      <Hero className="padding-vert--xl" shadow>
        <HeroTitle className={clsx('text--center', styles.home)}>
          <Logo
            aria-label="SHINJU DATE"
            className={styles.logo}
            height="80"
            width="256"
          />
        </HeroTitle>

        <nav className="margin-top--xl text--center">
          <Link href="/search" passHref>
            <LinkButton
              className="margin-left--sm"
              color="primary"
              outline
              size="lg"
            >
              動画一覧
            </LinkButton>
          </Link>
        </nav>
      </Hero>

      <Container className="margin-bottom--lg" id="schedule">
        <Timeline values={items} />
      </Container>
    </>
  )
}

export default IndexPage
