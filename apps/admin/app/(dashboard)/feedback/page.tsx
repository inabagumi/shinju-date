import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  FeatureRequestList,
  FeatureRequestListSkeleton,
} from './_components/feedback-list'
import { getFeatureRequests } from './_lib/get-feedback'

export const metadata: Metadata = {
  title: '機能要望管理',
}

async function FeatureRequestListData() {
  const featureRequests = await getFeatureRequests()

  return <FeatureRequestList featureRequests={featureRequests} />
}

export default function FeedbackPage() {
  return (
    <div>
      <PageHeader title="機能要望管理" />

      {/* Feature Request List */}
      <Suspense fallback={<FeatureRequestListSkeleton />}>
        <FeatureRequestListData />
      </Suspense>
    </div>
  )
}
