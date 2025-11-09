import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
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
    <div>
      <div className="mb-6">
        <h1 className="font-bold text-2xl">タレント管理</h1>
        <p className="mt-2 text-gray-600 text-sm">
          登録されているタレントの一覧を表示します。
        </p>
      </div>

      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-gray-200" />}
      >
        <TalentsListData />
      </Suspense>
    </div>
  )
}
