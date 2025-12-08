import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from '@shinju-date/constants'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Suspense } from 'react'
import LiveAndRecent, {
  LiveAndRecentSkeleton,
} from '@/components/live-and-recent'
import NoResults from '@/components/no-results'
import Timeline, { TimelineSkeleton } from '@/components/timeline'
import { fetchDashboardVideos, fetchUpcomingVideos } from '@/lib/fetchers'
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

      <main className="mx-auto max-w-6xl space-y-12 px-4 pt-12">
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
