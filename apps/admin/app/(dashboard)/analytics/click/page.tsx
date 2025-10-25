import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AnalyticsPageSkeleton } from '@/components/skeletons'
import { ClickAnalyticsContent } from './_components/click-analytics-content'

export const metadata: Metadata = {
  title: 'クリックアナリティクス',
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ClickAnalyticsPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <ClickAnalyticsContent searchParams={params} />
    </Suspense>
  )
}
