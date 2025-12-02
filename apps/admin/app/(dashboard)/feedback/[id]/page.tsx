import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getFeatureRequestById } from '../_lib/get-feedback'
import { FeatureRequestDetail } from './_components/feedback-detail'

interface Props {
  params: Promise<{
    id: string
  }>
}

async function FeatureRequestDetailData({ id }: { id: string }) {
  'use cache: private'

  cacheLife('minutes')

  const featureRequest = await getFeatureRequestById(id)

  if (!featureRequest) {
    notFound()
  }

  return <FeatureRequestDetail featureRequest={featureRequest} />
}

async function FeatureRequestDetailContent({ params }: Props) {
  const { id } = await params

  return (
    <>
      <div className="mb-6">
        <Link className="text-blue-600 hover:underline" href="/feedback">
          ← 機能要望一覧に戻る
        </Link>
      </div>

      <h1 className="mb-6 font-bold text-3xl">機能要望詳細</h1>

      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-gray-200" />}
      >
        <FeatureRequestDetailData id={id} />
      </Suspense>
    </>
  )
}

export default function FeedbackDetailPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-gray-200" />}
      >
        <FeatureRequestDetailContent params={params} />
      </Suspense>
    </div>
  )
}
