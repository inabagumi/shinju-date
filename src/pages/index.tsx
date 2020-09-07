import clsx from 'clsx'
import { isFuture, startOfHour, subHours } from 'date-fns'
import { NextPage } from 'next'
import Link from 'next/link'
import { NextSeo } from 'next-seo'
import React from 'react'
import useSWR from 'swr'
import { Logo, hero, shareCard } from '@/assets'
import Container from '@/components/atoms/Container'
import Timeline from '@/components/organisms/Timeline'
import { useSiteMetadata } from '@/context/SiteContext'
import styles from '@/styles/home.module.css'
import type { SearchResponseBody } from '@/types'

const popularitySearchQueries = ['Minecraft', 'DbD', 'RFA', 'Mr.President!']

const getRequestURL = (now = new Date()): string => {
  const hours = startOfHour(now)
  const since = subHours(hours, 5)
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
              url: new URL(shareCard, baseURL).toString(),
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

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            <Logo
              aria-label="SHINJU DATE"
              className={styles.logo}
              height={80}
              role="img"
              width={256}
            />
          </h1>
        </div>

        <div className={styles.heroImage}>
          <img
            alt=""
            className={styles.heroImageEntity}
            height={1080}
            role="presentation"
            src={hero}
            width={1920}
          />
        </div>
      </div>

      <Container className="margin-bottom--lg" id="schedule">
        {popularitySearchQueries.length > 0 && (
          <div className="padding-vert--lg">
            <ul className="pills pills--block">
              {popularitySearchQueries.map((query) => (
                <li className={clsx('pills__item', styles.pill)} key={query}>
                  <Link
                    as={`/search?q=${query}`}
                    href={{
                      pathname: '/search',
                      query: {
                        q: query
                      }
                    }}
                    prefetch={false}
                  >
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    <a
                      aria-label={`『${query}』の検索結果`}
                      className={styles.pillLink}
                      title={`『${query}』の検索結果`}
                    >
                      {query}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Timeline
          values={items?.filter(
            (item) => isFuture(item.publishedAt) || !item.duration
          )}
        />
      </Container>
    </>
  )
}

export default IndexPage
