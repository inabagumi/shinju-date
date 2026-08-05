import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
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
      <h1 className="mb-2 font-bold text-3xl">タレント管理</h1>
      <div className="mb-6">
        <p className="text-gray-600 text-sm">
          登録されているタレントの一覧を表示します。
        </p>
      </div>

      <Suspense fallback={<ManagementTableSkeleton />}>
        <TalentsListData />
      </Suspense>
    </div>
  )
}
