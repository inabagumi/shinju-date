import clsx from 'clsx'
import { isFuture, startOfHour, subHours } from 'date-fns'
import type { NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NextSeo } from 'next-seo'
import useSWR from 'swr'

import Logo from '@/assets/logo.svg'
import hero from '@/assets/hero.jpg'
import shareCard from '@/assets/share-card.jpg'
import Page from '@/components/Layout'
import Timeline from '@/components/Timeline'
import styles from '@/styles/home.module.css'
import type SearchResponseBody from '@/types/SearchResponseBody'

const tagline =
  '774 inc. 所属タレントの配信スケジュールや動画の検索ができるウェブサービス'

const popularitySearchQueries = [
  'Minecraft',
  '桃太郎電鉄',
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
              height: shareCard.height,
              url: new URL(shareCard.src, baseURL).toString(),
              width: shareCard.width
            }
          ],
          type: 'website'
        }}
        title="SHINJU DATE"
        titleTemplate={`%s - ${tagline}`}
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
            <Image alt="" priority role="presentation" src={hero} />
          </div>
        </div>

        <div className="container margin-bottom--lg">
          {popularitySearchQueries.length > 0 && (
            <div className="padding-vert--lg">
              <ul className="pills pills--block">
                {popularitySearchQueries.map((query) => (
                  <li className={clsx('pills__item', styles.pill)} key={query}>
                    <Link href={`/search?q=${query}`} prefetch={false}>
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
