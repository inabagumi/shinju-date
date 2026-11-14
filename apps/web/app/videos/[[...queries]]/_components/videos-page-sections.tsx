import { Suspense } from 'react'
import NoResults from '@/components/no-results'
import PageHeader, { PageHeaderSkeleton } from '@/components/page-header'
import SearchExitTracker from '@/components/search-exit-tracker'
import SearchQueryTracker from '@/components/search-query-tracker'
import SearchResults from '@/components/search-results'
import VideoKindFilterNav, {
  VideoKindFilterNavSkeleton,
} from '@/components/video-kind-filter-nav'
import { countVideos, fetchVideos } from '@/lib/fetchers'
import { getDisplayRecommendationQueries } from '@/lib/recommendations/get-display-queries'
import { parseQueries } from '@/lib/url'
import {
  parseVideoKindFilter,
  VIDEO_KIND_FILTER_OPTIONS,
  VIDEO_KIND_SEARCH_PARAM,
  type VideoKindFilter,
} from '@/lib/video-kind-filter'

export interface VideosPageSectionProps {
  params: Promise<{
    queries?: string[]
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

interface VideosPageOptions {
  kind: VideoKindFilter
  query: string
}

async function getVideosPageOptions({
  params,
  searchParams,
}: VideosPageSectionProps): Promise<VideosPageOptions> {
  const [{ queries }, searchParamValues] = await Promise.all([
    params,
    searchParams,
  ])

  return {
    kind: parseVideoKindFilter(searchParamValues[VIDEO_KIND_SEARCH_PARAM]),
    query: parseQueries(queries),
  }
}

async function ResultCount({ kind, query }: VideosPageOptions) {
  const count = await countVideos({ kind, query })

  return <p className="tabular-nums">{count.toLocaleString('ja-JP')}件</p>
}

function ResultCountSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-[1lh] w-16 animate-pulse rounded-control bg-muted"
    />
  )
}

export function VideosPageHeadingSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <VideoKindFilterNavSkeleton />
    </>
  )
}

export async function VideosPageHeading(props: VideosPageSectionProps) {
  const { kind, query } = await getVideosPageOptions(props)

  if (query) {
    const title = `『${query}』の検索結果`

    return (
      <>
        <PageHeader
          breadcrumbs={[{ href: '/videos', name: '動画一覧' }, { name: title }]}
          description={
            <Suspense fallback={<ResultCountSkeleton />}>
              <ResultCount kind={kind} query={query} />
            </Suspense>
          }
          title={title}
        />
        <VideoKindFilterNav current={kind} query={query} />
      </>
    )
  }

  return (
    <>
      <PageHeader breadcrumbs={[{ name: '動画一覧' }]} title="動画一覧" />
      <VideoKindFilterNav current={kind} query={query} />
    </>
  )
}

/** 見つからなかった種別の呼び名。「すべて」では「動画」と呼ぶ */
function getKindName(kind: VideoKindFilter): string {
  if (kind === 'all') {
    return '動画'
  }

  return (
    VIDEO_KIND_FILTER_OPTIONS.find((option) => option.value === kind)?.label ??
    '動画'
  )
}

export async function VideosPageResults(props: VideosPageSectionProps) {
  const { kind, query } = await getVideosPageOptions(props)
  const videos = await fetchVideos({ kind, query })

  if (videos.length < 1) {
    const kindName = getKindName(kind)
    const message = query
      ? `『${query}』に一致する${kindName}は見つかりませんでした。`
      : `${kindName}は見つかりませんでした。`
    const hint = query
      ? '別のキーワードや短いキーワードで検索するか、ひらがな・カタカナ・英字の表記を変えてお試しください。'
      : undefined
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
          {...(hint ? { hint } : {})}
        />
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
      <SearchResults kind={kind} prefetchedData={[videos]} query={query} />
    </>
  )
}
