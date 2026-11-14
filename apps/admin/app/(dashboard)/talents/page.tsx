import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { ManagementTableSkeleton } from '@/components/skeletons'
import { TalentsList } from './_components/talents-list'
import { getTalents } from './_lib/get-talents'

export const metadata: Metadata = {
  title: 'タレント管理',
}

async function TalentsListData() {
  'use cache: private'

  cacheLife('minutes')

  const talents = await getTalents()

  return <TalentsList talents={talents} />
}

export default function TalentsPage() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader
        description="登録されているタレントの一覧を表示します。"
        title="タレント管理"
      />

      <Suspense fallback={<ManagementTableSkeleton />}>
        <TalentsListData />
      </Suspense>
    </div>
  )
}
