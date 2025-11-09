import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { TalentsList } from './_components/talents-list'
import { getTalents } from './_lib/get-talents'

export const metadata: Metadata = {
  title: 'タレント管理',
}

async function TalentsContent() {
  'use cache: private'
  cacheLife('minutes')

  const talents = await getTalents()

  return <TalentsList talents={talents} />
}

export default function TalentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
        </div>
      }
    >
      <TalentsContent />
    </Suspense>
  )
}
