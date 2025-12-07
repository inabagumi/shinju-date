import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from '@shinju-date/constants'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import LiveAndRecent, {
  LiveAndRecentSkeleton,
} from '@/components/live-and-recent'
import NoResults from '@/components/no-results'
import Timeline, { TimelineSkeleton } from '@/components/timeline'
import { fetchDashboardVideos, fetchUpcomingVideos } from '@/lib/fetchers'
import {
  getDisplayRecommendationQueries,
  TOTAL_DISPLAY_COUNT,
} from '@/lib/recommendations/get-display-queries'
import hero from './_assets/hero.jpg'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    description: SITE_DESCRIPTION,
    title: SITE_NAME,
    type: 'website',
    url: '/',
  },
  title: {
    absolute: `${SITE_NAME} - ${SITE_TAGLINE}`,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
  },
}

async function HomeTimeline() {
  const videos = await fetchUpcomingVideos()

  return videos.length > 0 ? (
    <Timeline prefetchedData={videos} />
  ) : (
    <NoResults message="YouTubeに登録されている配信予定の動画がありません。" />
  )
}

async function HomeLiveAndRecent() {
  const data = await fetchDashboardVideos()

  return <LiveAndRecent prefetchedData={data} />
}

function RecommendationQueriesSkeleton() {
  return (
    <div className="py-4">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-2 md:grid-cols-4">
        {Array(TOTAL_DISPLAY_COUNT)
          .fill(0)
          .map((_, i) => (
            <li
              className=""
              // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton用なので連番でも問題なし。
              key={`pill-${i}`}
            >
              <span className="block rounded-xl px-1 py-2 text-center hover:bg-774-nevy-100 dark:hover:bg-zinc-600">
                <span className="inline-block h-4 w-20 animate-pulse bg-774-nevy-100 dark:bg-zinc-800" />
              </span>
            </li>
          ))}
      </ul>
    </div>
  )
}

async function RecommendationQueries() {
  const queries = await getDisplayRecommendationQueries()

  if (queries.length < 1) {
    return <RecommendationQueriesSkeleton />
  }

  return (
    <nav className="py-4">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-2 md:grid-cols-4">
        {queries.map((query) => (
          <li key={query}>
            <Link
              aria-label={`『${query}』の検索結果`}
              className="block rounded-xl px-1 py-2 text-center hover:bg-774-nevy-100 dark:hover:bg-zinc-600"
              href={`/videos/${encodeURIComponent(query)}`}
              title={`『${query}』の検索結果`}
            >
              {query}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function SchedulePage() {
  return (
    <>
      <div className="relative aspect-4/3 bg-slate-700 sm:aspect-video">
        <div className="absolute right-0 bottom-0 left-0 z-20 bg-linear-to-t from-slate-900/80 text-white">
          <h1 className="px-8 py-6 text-center md:text-left">
            <svg
              aria-label="SHINJU DATE"
              className="inline-block h-14 w-auto drop-shadow-2xl"
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
          className="absolute inset-0 z-10 h-full w-full object-cover"
          priority
          role="presentation"
          sizes="100vw"
          src={hero}
        />
      </div>

      <main className="mx-auto max-w-6xl space-y-12 px-4">
        <Suspense fallback={<RecommendationQueriesSkeleton />}>
          <RecommendationQueries />
        </Suspense>

        <Suspense fallback={<LiveAndRecentSkeleton />}>
          <HomeLiveAndRecent />
        </Suspense>

        <Suspense fallback={<TimelineSkeleton />}>
          <HomeTimeline />
        </Suspense>
      </main>
    </>
  )
}
