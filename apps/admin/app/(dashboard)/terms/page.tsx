import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { TermsList } from './_components/terms-list'
import getTerms from './_lib/get-terms'

async function TermsContent() {
  'use cache: private'
  cacheLife('minutes')

  const terms = await getTerms()

  return <TermsList terms={terms} />
}

export default function TermsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
        </div>
      }
    >
      <TermsContent />
    </Suspense>
  )
}
