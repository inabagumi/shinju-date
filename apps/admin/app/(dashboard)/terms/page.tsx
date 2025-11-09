import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { TermsList } from './_components/terms-list'
import getTerms from './_lib/get-terms'

async function TermsListData() {
  'use cache: private'
  cacheLife('minutes')

  const terms = await getTerms()

  return <TermsList terms={terms} />
}

export default function TermsPage() {
  return (
    <div className="p-6">
      {/* Static header */}
      <h1 className="mb-6 font-bold text-3xl">用語管理</h1>

      {/* Dynamic content with Suspense */}
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-gray-200" />}
      >
        <TermsListData />
      </Suspense>
    </div>
  )
}
