import NoResults from '@/components/no-results'
import SearchExitTracker from '@/components/search-exit-tracker'
import SearchQueryTracker from '@/components/search-query-tracker'
import SearchResults from '@/components/search-results'
import { fetchVideos } from '@/lib/fetchers'
import { getDisplayRecommendationQueries } from '@/lib/recommendations/get-display-queries'
import { parseQueries } from '@/lib/url'

export interface VideosPageSectionProps {
  params: Promise<{
    queries?: string[]
  }>
}

export async function VideosPageHeading({ params }: VideosPageSectionProps) {
  const { queries } = await params
  const query = parseQueries(queries)
  const title = query ? `『${query}』の検索結果` : '動画一覧'

  return <h1 className="font-semibold text-xl">{title}</h1>
}

export function VideosPageHeadingSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-8 w-64 animate-pulse rounded-md bg-774-nevy-100 dark:bg-zinc-800"
    />
  )
}

export async function VideosPageResults({ params }: VideosPageSectionProps) {
  const { queries } = await params
  const query = parseQueries(queries)
  const videos = await fetchVideos({ query })

  if (videos.length < 1) {
    const message = query
      ? `『${query}』で検索しましたが一致する動画は見つかりませんでした。`
      : '動画は見つかりませんでした。'
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
        <NoResults message={message} recommendedQueries={recommendedQueries} />
      </>
    )
  }

  return (
    <>
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
