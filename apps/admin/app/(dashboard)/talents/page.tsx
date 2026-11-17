import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ManagementTableSkeleton } from '@/components/skeletons'
import { TalentsList } from './_components/talents-list'
import { getTalents } from './_lib/get-talents'
import { talentSearchParamsSchema } from './_lib/search-params-schema'

export const metadata: Metadata = {
  title: 'タレント管理',
}

async function TalentsListData({
  searchParams,
}: Pick<PageProps<'/talents'>, 'searchParams'>) {
  const [talents, rawParams] = await Promise.all([getTalents(), searchParams])
  const { search, sort, status } = talentSearchParamsSchema.parse(rawParams)

  return (
    <TalentsList
      search={search}
      sortOrder={sort}
      statusFilter={status}
      talents={talents}
    />
  )
}

export default function TalentsPage({ searchParams }: PageProps<'/talents'>) {
  return (
    <div>
      <PageHeader
        description="登録されているタレントの一覧を表示します。"
        title="タレント管理"
      />

      <Suspense fallback={<ManagementTableSkeleton />}>
        <TalentsListData searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
