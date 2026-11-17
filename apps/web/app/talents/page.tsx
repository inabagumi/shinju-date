import type { Metadata } from 'next'
import { Suspense } from 'react'
import PageHeader from '@/components/page-header'
import { MAIN_CONTENT_ID } from '@/components/skip-link'
import { SITE_NAME as siteName } from '@/lib/site'
import { TalentGridSkeleton } from './_components/talent-grid'
import {
  TalentCount,
  TalentCountSkeleton,
  TalentListGrid,
} from './_components/talent-list-sections'

const TITLE = 'タレント一覧'

export const metadata: Metadata = {
  alternates: {
    canonical: '/talents',
  },
  openGraph: {
    siteName,
    title: TITLE,
    type: 'website',
  },
  title: TITLE,
  twitter: {
    title: `${TITLE} - ${siteName}`,
  },
}

/**
 * The list of the active talents. The heading is a part of the static shell,
 * and only the number of talents and the grid wait for the talents.
 */
export default function TalentsPage() {
  return (
    <main
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"
      id={MAIN_CONTENT_ID}
    >
      <PageHeader
        breadcrumbs={[{ name: TITLE }]}
        description={
          <Suspense fallback={<TalentCountSkeleton />}>
            <TalentCount />
          </Suspense>
        }
        title={TITLE}
      />

      <Suspense fallback={<TalentGridSkeleton />}>
        <TalentListGrid />
      </Suspense>
    </main>
  )
}
