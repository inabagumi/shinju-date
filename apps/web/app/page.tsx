import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from '@shinju-date/constants'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Suspense } from 'react'
import {
  type DashboardVideos,
  LiveSection,
  RecentSection,
  RecentSectionSkeleton,
  ScheduleSection,
  ScheduleSectionSkeleton,
  ShortsSection,
  ShortsSectionSkeleton,
} from '@/components/home-sections'
import { MAIN_CONTENT_ID } from '@/components/skip-link'
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

interface DashboardSectionProps {
  dashboardVideos: Promise<DashboardVideos>
}

async function HomeLive({ dashboardVideos }: DashboardSectionProps) {
  return <LiveSection prefetchedData={await dashboardVideos} />
}

async function HomeSchedule() {
  const videos = await fetchUpcomingVideos()

  return <ScheduleSection prefetchedData={videos} />
}

async function HomeRecent({ dashboardVideos }: DashboardSectionProps) {
  return <RecentSection prefetchedData={await dashboardVideos} />
}

async function HomeShorts({ dashboardVideos }: DashboardSectionProps) {
  return <ShortsSection prefetchedData={await dashboardVideos} />
}

export default function SchedulePage() {
  // 配信中・新着動画・ショートは1回の取得を3つのセクションで分け合う
  const dashboardVideos = fetchDashboardVideos()

  return (
    <>
      <div className="relative aspect-4/3 w-full bg-slate-700 sm:aspect-auto sm:h-90">
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

      <main
        className="mx-auto max-w-6xl scroll-mt-20 space-y-12 px-4 pt-12"
        id={MAIN_CONTENT_ID}
      >
        {/* 配信中が0件のときはセクションごと表示しないため、読み込み中も何も置かない */}
        <Suspense fallback={null}>
          <HomeLive dashboardVideos={dashboardVideos} />
        </Suspense>

        <Suspense fallback={<ScheduleSectionSkeleton />}>
          <HomeSchedule />
        </Suspense>

        <Suspense fallback={<RecentSectionSkeleton />}>
          <HomeRecent dashboardVideos={dashboardVideos} />
        </Suspense>

        <Suspense fallback={<ShortsSectionSkeleton />}>
          <HomeShorts dashboardVideos={dashboardVideos} />
        </Suspense>
      </main>
    </>
  )
}
