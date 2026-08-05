import { SITE_NAME as siteName } from '@shinju-date/constants'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import NoResults from '@/components/no-results'
import SearchExitTracker from '@/components/search-exit-tracker'
import SearchQueryTracker from '@/components/search-query-tracker'
import SearchResults, {
  SearchResultsSkeleton,
} from '@/components/search-results'
import { fetchVideos } from '@/lib/fetchers'
import { getDisplayRecommendationQueries } from '@/lib/recommendations/get-display-queries'
import { parseQueries } from '@/lib/url'

interface VideosPageProps {
  params: Promise<{
    queries?: string[]
  }>
}

export async function generateMetadata({
  params,
}: VideosPageProps): Promise<Metadata> {
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

export default function VideosPage({ params }: VideosPageProps) {
  return (
    <Suspense fallback={<VideosPageSkeleton />}>
      <VideosPageContent params={params} />
    </Suspense>
  )
}

async function VideosPageContent({ params }: VideosPageProps) {
  const { queries } = await params
  const query = parseQueries(queries)

  const title = query ? `『${query}』の検索結果` : '動画一覧'
  const videos = await fetchVideos({
    query,
  })

  if (videos.length < 1) {
    const message = query
      ? `『${query}』で検索しましたが一致する動画は見つかりませんでした。`
      : '動画は見つかりませんでした。'

    // Get recommended queries for no-results page
    const recommendedQueries = query
      ? await getDisplayRecommendationQueries()
      : []

    return (
      <>
        {query && (
          <>
            <SearchQueryTracker query={query} resultsCount={0} />
            <SearchExitTracker hasResults={false} query={query} />
          </>
        )}
        <NoResults
          message={message}
          recommendedQueries={recommendedQueries}
          title="検索結果はありません"
        />
      </>
    )
  }

  return (
    <>
      <h1 className="font-semibold text-xl">{title}</h1>

      {query && (
        <>
          <SearchQueryTracker query={query} resultsCount={videos.length} />
          <SearchExitTracker hasResults={true} query={query} />
        </>
      )}

      <SearchResults prefetchedData={[videos]} query={query} />
    </>
  )
}

function VideosPageSkeleton() {
  return (
    <>
      <h1 className="font-semibold text-xl">
        <span className="inline-block h-8 w-64 animate-pulse rounded-md bg-774-nevy-100 dark:bg-zinc-800" />
      </h1>

      <SearchResultsSkeleton />
    </>
  )
}
