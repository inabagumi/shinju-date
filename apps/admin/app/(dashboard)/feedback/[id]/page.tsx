import { PageHeader } from '@shinju-date/ui'
import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { StackedDetailSkeleton } from '@/components/skeletons'
import { createTitleFromMessage } from '../_lib/create-title-from-message'
import { getFeatureRequestById } from '../_lib/get-feedback'
import { FeatureRequestDetail } from './_components/feedback-detail'

interface Props {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  'use cache: private'

  cacheLife('minutes')

  const { id } = await params

  const featureRequest = await getFeatureRequestById(id)

  if (!featureRequest) {
    return {
      title: '機能要望が見つかりません',
    }
  }

  const title = createTitleFromMessage(featureRequest.message)

  return {
    title: `${title} - 機能要望詳細`,
  }
}

async function CachedFeatureRequestDetail({ id }: { id: string }) {
  'use cache: private'

  cacheLife('minutes')

  const featureRequest = await getFeatureRequestById(id)

  if (!featureRequest) {
    notFound()
  }

  return <FeatureRequestDetail featureRequest={featureRequest} />
}

export default function FeedbackDetailPage({ params }: Props) {
  return (
    <div>
      <div className="mb-4">
        <Link
          className="inline-flex items-center gap-1 rounded-control text-meta text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          href="/feedback"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          機能要望一覧に戻る
        </Link>
      </div>

      <PageHeader title="機能要望詳細" />

      <Suspense fallback={<StackedDetailSkeleton />}>
        {params.then(({ id }) => (
          <CachedFeatureRequestDetail id={id} />
        ))}
      </Suspense>
    </div>
  )
}
