import { SITE_NAME as siteName } from '@shinju-date/constants'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SearchResultsSkeleton } from '@/components/search-results'
import { MAIN_CONTENT_ID } from '@/components/skip-link'
import { fetchTalent } from '@/lib/fetchers'
import { getTalentCalendarPath, getTalentPath } from '@/lib/talent-links'
import {
  TalentPageHeading,
  TalentPageHeadingSkeleton,
} from './_components/talent-page-header'
import { TalentStreamTendency } from './_components/talent-stream-tendency'
import {
  TalentVideoKindFilterNav,
  TalentVideoKindFilterNavSkeleton,
  TalentVideos,
} from './_components/talent-videos'

export async function generateMetadata({
  params,
}: Pick<PageProps<'/talents/[id]'>, 'params'>): Promise<Metadata> {
  const { id } = await params
  const talent = await fetchTalent(id)

  if (!talent) {
    notFound()
  }

  return {
    alternates: {
      canonical: getTalentPath(talent.id),
      types: {
        'text/calendar': getTalentCalendarPath(talent.id),
      },
    },
    openGraph: {
      siteName,
      title: talent.name,
      type: 'profile',
    },
    title: talent.name,
    twitter: {
      card: 'summary_large_image',
      title: `${talent.name} - ${siteName}`,
    },
  }
}

/**
 * タレント詳細。`params` は Suspense の中の各部品で読み、外側は静的なシェルにする。
 * 表示しないタレントでは、各部品が `notFound()` を呼ぶ。
 */
export default function TalentPage({
  params,
  searchParams,
}: PageProps<'/talents/[id]'>) {
  return (
    <main
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"
      id={MAIN_CONTENT_ID}
    >
      {/*
       * The tendency of the streams is put beside the heading on wide screens,
       * so it does not push the videos down, and below it on narrow ones
       */}
      <div className="md:flex md:items-start md:gap-8">
        <div className="min-w-0 md:flex-1">
          <Suspense fallback={<TalentPageHeadingSkeleton />}>
            <TalentPageHeading params={params} />
          </Suspense>
        </div>

        {/* Nothing is shown while loading, as some talents do not show it */}
        <Suspense fallback={null}>
          <TalentStreamTendency params={params} />
        </Suspense>
      </div>

      <Suspense fallback={<TalentVideoKindFilterNavSkeleton />}>
        <TalentVideoKindFilterNav params={params} searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<SearchResultsSkeleton />}>
        <TalentVideos params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
