import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { FeedbackList } from './_components/feedback-list'
import { getFeedback } from './_lib/get-feedback'

async function FeedbackListData() {
  'use cache: private'

  cacheLife('minutes')

  const feedback = await getFeedback()

  return <FeedbackList feedback={feedback} />
}

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-3xl">フィードバック管理</h1>
        </div>

        {/* Feedback List */}
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <FeedbackListData />
        </Suspense>
      </div>
    </div>
  )
}
