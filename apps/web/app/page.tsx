import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import NoResults from '@/components/no-results'
import Skeleton from '@/components/skeleton'
import { SkipNavContent } from '@/components/skip-nav'
import Timeline, { TimelineSkeleton } from '@/components/timeline'
import { description, tagline, title } from '@/lib/constants'
import { fetchNotEndedVideos } from '@/lib/fetchers'
import { redisClient } from '@/lib/redis'
import hero from './_assets/hero.jpg'
import styles from './page.module.css'

const RECOMMENDATION_QUERIES_COUNT = 4

export const runtime = 'edge'
export const revalidate = 60

export const metadata = {
  alternates: {
    canonical: '/'
  },
  description,
  openGraph: {
    description,
    title,
    type: 'website',
    url: '/'
  },
  title: {
    absolute: `${title} - ${tagline}`
  },
  twitter: {
    card: 'summary_large_image',
    title
  }
}

async function HomeTimeline() {
  const videos = await fetchNotEndedVideos({})

  return videos.length > 0 ? (
    <Timeline prefetchedData={videos} />
  ) : (
    <NoResults message="YouTubeに登録されている配信予定の動画がありません。" />
  )
}

function RecommendationQueriesSkeleton() {
  return (
    <div className="padding-vert--lg">
      <ul className="pills pills--block">
        {Array(RECOMMENDATION_QUERIES_COUNT)
          .fill(0)
          .map((_, i) => (
            <li
              className={clsx('pills__item', styles['pill'])}
              key={`pill-${i}`}
            >
              <Skeleton />
            </li>
          ))}
      </ul>
    </div>
  )
}

async function RecommendationQueries() {
  const queries = await redisClient.srandmember<string[]>(
    'recommendation_queries',
    RECOMMENDATION_QUERIES_COUNT
  )

  if (!queries || queries.length < 1) {
    return <RecommendationQueriesSkeleton />
  }

  return (
    <div className="padding-vert--lg">
      <ul className="pills pills--block">
        {queries.map((query) => (
          <li className={clsx('pills__item', styles['pill'])} key={query}>
            <Link
              aria-label={`『${query}』の検索結果`}
              className={styles['pillLink']}
              href={`/videos/${encodeURIComponent(query)}`}
              title={`『${query}』の検索結果`}
            >
              {query}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <>
      <div className={styles['hero']}>
        <div className={styles['heroInner']}>
          <h1 className={styles['heroTitle']}>
            <svg
              aria-label="SHINJU DATE"
              className={styles['logo']}
              height={80}
              role="img"
              width={256}
            >
              <use xlinkHref="#svg-symbols-logo" />
            </svg>
          </h1>
        </div>

        <Image
          alt=""
          className={styles['heroImage']}
          fill
          priority
          role="presentation"
          src={hero}
        />
      </div>

      <SkipNavContent>
        <main className="container">
          <Suspense fallback={<RecommendationQueriesSkeleton />}>
            <RecommendationQueries />
          </Suspense>

          <div className="margin-bottom--lg">
            <Suspense fallback={<TimelineSkeleton />}>
              <HomeTimeline />
            </Suspense>
          </div>
        </main>
      </SkipNavContent>
    </>
  )
}
