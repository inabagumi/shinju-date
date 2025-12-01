import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getFeedbackById } from '../_lib/get-feedback'
import { FeedbackDetail } from './_components/feedback-detail'

interface Props {
  params: Promise<{
    id: string
  }>
}

async function FeedbackDetailData({ id }: { id: string }) {
  'use cache: private'

  cacheLife('minutes')

  const feedback = await getFeedbackById(id)

  if (!feedback) {
    notFound()
  }

  return <FeedbackDetail feedback={feedback} />
}

export default async function FeedbackDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link className="text-blue-600 hover:underline" href="/feedback">
          ← フィードバック一覧に戻る
        </Link>
      </div>

      <h1 className="mb-6 font-bold text-3xl">フィードバック詳細</h1>

      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-gray-200" />}
      >
        <FeedbackDetailData id={id} />
      </Suspense>
    </div>
  )
}
