import { SITE_NAME as siteName } from '@shinju-date/constants'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import PageHeader from '@/components/page-header'
import { MAIN_CONTENT_ID } from '@/components/skip-link'
import {
  TalentCount,
  TalentCountSkeleton,
  TalentList,
  TalentListSkeleton,
} from './_components/talent-list'

const title = 'タレント一覧'

export const metadata: Metadata = {
  alternates: {
    canonical: '/talents',
  },
  openGraph: {
    siteName,
    title,
    type: 'article',
  },
  title,
  twitter: {
    title: `${title} - ${siteName}`,
  },
}

/**
 * The active talents. The heading is the static shell, and only the number
 * of talents and the grid wait for the data.
 */
export default function TalentsPage() {
  return (
    <main
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"
      id={MAIN_CONTENT_ID}
    >
      <PageHeader
        breadcrumbs={[{ name: title }]}
        description={
          <Suspense fallback={<TalentCountSkeleton />}>
            <TalentCount />
          </Suspense>
        }
        title={title}
      />

      <Suspense fallback={<TalentListSkeleton />}>
        <TalentList />
      </Suspense>
    </main>
  )
}
