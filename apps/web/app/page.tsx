import { type Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import NoResults from '@/components/no-results'
import Timeline, { TimelineSkeleton } from '@/components/timeline'
import { description, tagline, title } from '@/lib/constants'
import { fetchNotEndedVideos } from '@/lib/fetchers'
import { redisClient } from '@/lib/redis'
import hero from './_assets/hero.jpg'

const RECOMMENDATION_QUERIES_COUNT = 4

// export const experimental_ppr = true
export const revalidate = 600 // 10 minutes

export const metadata: Metadata = {
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

async function HomeTimeline({
  videosPromise
}: Readonly<{
  videosPromise: ReturnType<typeof fetchNotEndedVideos>
}>) {
  const videos = await videosPromise

  return videos.length > 0 ? (
    <Timeline prefetchedData={videos} />
  ) : (
    <NoResults message="YouTubeに登録されている配信予定の動画がありません。" />
  )
}

function RecommendationQueriesSkeleton() {
  return (
    <div className="py-4">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-2 md:grid-cols-4">
        {Array(RECOMMENDATION_QUERIES_COUNT)
          .fill(0)
          .map((_, i) => (
            <li className="" key={`pill-${i}`}>
              <span className="block rounded-xl py-2 px-1 text-center hover:bg-774-nevy-100 dark:hover:bg-zinc-600">
                <span className="inline-block h-4 w-20 animate-pulse bg-774-nevy-100 dark:bg-zinc-800" />
              </span>
            </li>
          ))}
      </ul>
    </div>
  )
}

async function RecommendationQueries({
  queriesPromise
}: Readonly<{
  queriesPromise: Promise<string[]>
}>) {
  const queries = await queriesPromise

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
              className="block rounded-xl py-2 px-1 text-center hover:bg-774-nevy-100 dark:hover:bg-zinc-600"
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
  const videosPromise = fetchNotEndedVideos({})
  const queriesPromise = redisClient
    .srandmember<
      string[]
    >('recommendation_queries', RECOMMENDATION_QUERIES_COUNT)
    .then((queries) => queries ?? [])

  return (
    <>
      <div className="relative aspect-[4/3] bg-slate-700 sm:aspect-video">
        <div className="absolute right-0 bottom-0 left-0 z-20 bg-gradient-to-t from-slate-900/80 text-white">
          <h1 className="py-6 px-8 text-center md:text-left">
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
          <RecommendationQueries queriesPromise={queriesPromise} />
        </Suspense>

        <Suspense fallback={<TimelineSkeleton />}>
          <HomeTimeline videosPromise={videosPromise} />
        </Suspense>
      </main>
    </>
  )
}
