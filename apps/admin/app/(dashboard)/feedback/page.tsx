import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { ListCardsSkeleton } from '@/components/skeletons'
import { FeatureRequestList } from './_components/feedback-list'
import { getFeatureRequests } from './_lib/get-feedback'

export const metadata: Metadata = {
  title: '機能要望管理',
}

async function FeatureRequestListData() {
  'use cache: private'

  cacheLife('minutes')

  const featureRequests = await getFeatureRequests()

  return <FeatureRequestList featureRequests={featureRequests} />
}

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader title="機能要望管理" />

      {/* Feature Request List */}
      <Suspense fallback={<ListCardsSkeleton />}>
        <FeatureRequestListData />
      </Suspense>
    </div>
  )
}
