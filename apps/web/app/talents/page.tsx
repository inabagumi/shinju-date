import { Suspense } from 'react'
import PageHeader from '@/components/page-header'
import PageMain from '@/components/page-main'
import { createPageMetadata } from '@/lib/metadata'
import { TalentGridSkeleton } from './_components/talent-grid'
import {
  TalentCount,
  TalentCountSkeleton,
  TalentListGrid,
} from './_components/talent-list-sections'

const TITLE = 'タレント一覧'

export const metadata = createPageMetadata({
  path: '/talents',
  title: TITLE,
})

/**
 * The list of the active talents. The heading is a part of the static shell,
 * and only the number of talents and the grid wait for the talents.
 */
export default function TalentsPage() {
  return (
    <PageMain>
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
    </PageMain>
  )
}
