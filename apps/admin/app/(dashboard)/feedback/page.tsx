import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  FeatureRequestList,
  FeatureRequestListSkeleton,
} from './_components/feedback-list'
import { getFeatureRequests } from './_lib/get-feedback'
import { feedbackSearchParamsSchema } from './_lib/search-params-schema'

export const metadata: Metadata = {
  title: '機能要望管理',
}

async function FeatureRequestListData({
  searchParams,
}: Pick<PageProps<'/feedback'>, 'searchParams'>) {
  const [featureRequests, rawParams] = await Promise.all([
    getFeatureRequests(),
    searchParams,
  ])
  const { read, status } = feedbackSearchParamsSchema.parse(rawParams)

  return (
    <FeatureRequestList
      featureRequests={featureRequests}
      readFilter={read}
      statusFilter={status}
    />
  )
}

export default function FeedbackPage({ searchParams }: PageProps<'/feedback'>) {
  return (
    <div>
      <PageHeader title="機能要望管理" />

      {/* Feature Request List */}
      <Suspense fallback={<FeatureRequestListSkeleton />}>
        <FeatureRequestListData searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
