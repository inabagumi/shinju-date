import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from '@shinju-date/constants'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Suspense } from 'react'
import PageMain from '@/components/page-main'
import { fetchDashboardVideos, fetchUpcomingVideos } from '@/lib/fetchers'
import { createPageMetadata } from '@/lib/metadata'
import hero from './_assets/hero.jpg'
import {
  type DashboardVideos,
  LiveSection,
  RecentSection,
  RecentSectionSkeleton,
  ScheduleSection,
  ScheduleSectionSkeleton,
  ShortsSection,
  ShortsSectionSkeleton,
} from './_components/home-sections'

const pageMetadata = createPageMetadata({
  absoluteTitle: `${SITE_NAME} - ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  path: '/',
  title: SITE_NAME,
})

export const metadata: Metadata = {
  ...pageMetadata,
  openGraph: {
    ...pageMetadata.openGraph,
    url: '/',
  },
  twitter: {
    ...pageMetadata.twitter,
    card: 'summary_large_image',
  },
}

interface DashboardSectionProps {
  dashboardVideos: Promise<DashboardVideos>
}

async function HomeLive({ dashboardVideos }: DashboardSectionProps) {
  return <LiveSection prefetchedData={await dashboardVideos} />
}

async function HomeSchedule() {
  const upcomingVideos = await fetchUpcomingVideos()

  return <ScheduleSection prefetchedData={upcomingVideos} />
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
      {/* 画像を読み込むまでは、フッターと同じブランドの地を見せる */}
      <div className="relative aspect-4/3 w-full bg-primary sm:aspect-auto sm:h-90">
        {/*
         * ロゴはイラストの上に重ねるので、ライト／ダークにかかわらず黒の
         * グラデーションと白で表示する
         */}
        <div className="absolute right-0 bottom-0 left-0 z-20 bg-linear-to-t from-black/80 text-white">
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

      <PageMain className="space-y-12 pt-12 pb-0">
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
      </PageMain>
    </>
  )
}
