import clsx from 'clsx'
import { isFuture, startOfHour, subHours } from 'date-fns'
import type { NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NextSeo } from 'next-seo'
import useSWR from 'swr'

import { Logo, hero, shareCard } from '@/assets'
import Page from '@/components/Layout'
import Timeline from '@/components/Timeline'
import styles from '@/styles/home.module.css'
import type { SearchResponseBody } from '@/types'

const popularitySearchQueries = [
  'Minecraft',
  'Dead by Daylight',
  'リングフィット アドベンチャー',
  'Detroit: Become Human'
]

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

  const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'
  const description = process.env.NEXT_PUBLIC_DESCRIPTION

  return (
    <>
      <NextSeo
        canonical={new URL('/', baseURL).toString()}
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
        title="SHINJU DATE"
        titleTemplate="%s"
        twitter={{
          cardType: 'summary_large_image'
        }}
      />

      <Page>
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
            <Image
              alt=""
              height={1080}
              priority
              role="presentation"
              src={hero}
              width={1920}
            />
          </div>
        </div>

        <div className="container margin-bottom--lg">
          {popularitySearchQueries.length > 0 && (
            <div className="padding-vert--lg">
              <ul className="pills pills--block">
                {popularitySearchQueries.map((query) => (
                  <li className={clsx('pills__item', styles.pill)} key={query}>
                    <Link href={`/search?q=${query}`} prefetch={false}>
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
        </div>
      </Page>
    </>
  )
}

export default IndexPage
