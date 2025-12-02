import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { FeatureRequestList } from './_components/feedback-list'
import { getFeatureRequests } from './_lib/get-feedback'

async function FeatureRequestListData() {
  'use cache: private'

  cacheLife('minutes')

  const featureRequests = await getFeatureRequests()

  return <FeatureRequestList featureRequests={featureRequests} />
}

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-3xl">機能要望管理</h1>
        </div>

        {/* Feature Request List */}
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <FeatureRequestListData />
        </Suspense>
      </div>
    </div>
  )
}
