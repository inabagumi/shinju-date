import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TalentsList, TalentsListSkeleton } from './_components/talents-list'
import { getTalents } from './_lib/get-talents'

export const metadata: Metadata = {
  title: 'タレント管理',
}

async function TalentsListData() {
  const talents = await getTalents()

  return <TalentsList talents={talents} />
}

export default function TalentsPage() {
  return (
    <div>
      <PageHeader
        description="登録されているタレントの一覧を表示します。"
        title="タレント管理"
      />

      <Suspense fallback={<TalentsListSkeleton />}>
        <TalentsListData />
      </Suspense>
    </div>
  )
}
