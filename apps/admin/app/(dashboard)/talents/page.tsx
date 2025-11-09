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
    <div className="p-6">
      {/* Static header */}
      <h1 className="mb-6 font-bold text-3xl">タレント管理</h1>

      {/* Dynamic content with Suspense */}
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-gray-200" />}
      >
        <TalentsListData />
      </Suspense>
    </div>
  )
}
