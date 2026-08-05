import { SITE_NAME as siteName } from '@shinju-date/constants'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchResultsSkeleton } from '@/components/search-results'
import { parseQueries } from '@/lib/url'
import {
  VideosPageHeading,
  VideosPageHeadingSkeleton,
  VideosPageResults,
  type VideosPageSectionProps,
} from './_components/videos-page-sections'

export async function generateMetadata({
  params,
}: VideosPageSectionProps): Promise<Metadata> {
  const { queries } = await params
  const query = parseQueries(queries)
  const title = query ? `『${query}』の検索結果` : '動画一覧'

  return {
    alternates: {
      canonical: query ? `/videos/${encodeURIComponent(query)}` : '/videos',
      types: {
        'text/calendar': !query ? '/videos.ics' : null,
      },
    },
    openGraph: {
      siteName,
      title,
      type: 'article',
    },
    robots: {
      index: !query,
    },
    title,
    twitter: {
      title: `${title} - ${siteName}`,
    },
  }
}

export default function VideosPage({ params }: VideosPageSectionProps) {
  return (
    <>
      <Suspense fallback={<VideosPageHeadingSkeleton />}>
        <VideosPageHeading params={params} />
      </Suspense>
      <Suspense fallback={<SearchResultsSkeleton />}>
        <VideosPageResults params={params} />
      </Suspense>
    </>
  )
}
