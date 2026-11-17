import { formatNumber } from '@shinju-date/helpers'
import { type ComponentProps, Suspense } from 'react'
import NoResults from '@/components/no-results'
import PageHeader, { PageHeaderSkeleton } from '@/components/page-header'
import SearchResults from '@/components/search-results'
import {
  countVideos,
  fetchActiveTalents,
  fetchVideos,
  type Talent,
} from '@/lib/fetchers'
import { getDisplayRecommendationQueries } from '@/lib/recommendations/get-display-queries'
import { getReferenceDate } from '@/lib/reference-date'
import { parseTalentIds, TALENT_SEARCH_PARAM } from '@/lib/talent-filter'
import { parseQueries } from '@/lib/url'
import {
  getVideoKindName,
  getVideosPath,
  parseVideoKindFilter,
  VIDEO_KIND_SEARCH_PARAM,
  type VideoKindFilter,
} from '@/lib/video-kind-filter'
import SearchExitTracker from './search-exit-tracker'
import SearchQueryTracker from './search-query-tracker'
import VideoFilters, { VideoFiltersSkeleton } from './video-filters'

interface VideosPageOptions {
  kind: VideoKindFilter
  query: string
  /** 選んでいるタレントの ID。重複を除いて並べ替えてある */
  talentIds: string[]
}

/**
 * 検索パラメーターのタレントの ID のうち、活動中のタレントに一致するもの。
 */
export async function getSelectedTalentIds(
  value: string | string[] | undefined,
): Promise<string[]> {
  if (!value || value.length === 0) {
    return []
  }

  const talents = await fetchActiveTalents()

  return parseTalentIds(
    value,
    talents.map((talent) => talent.id),
  )
}

async function getVideosPageOptions({
  params,
  searchParams,
}: PageProps<'/videos/[[...queries]]'>): Promise<VideosPageOptions> {
  const [{ queries }, searchParamValues] = await Promise.all([
    params,
    searchParams,
  ])

  return {
    kind: parseVideoKindFilter(searchParamValues[VIDEO_KIND_SEARCH_PARAM]),
    query: parseQueries(queries),
    talentIds: await getSelectedTalentIds(
      searchParamValues[TALENT_SEARCH_PARAM],
    ),
  }
}

async function ResultCount({ kind, query, talentIds }: VideosPageOptions) {
  const count = await countVideos({ kind, query, talentIds })

  return <p className="tabular-nums">{formatNumber(count)}件</p>
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
      <VideoFiltersSkeleton />
    </>
  )
}

interface VideosPageFiltersProps extends VideosPageOptions {
  talents: Talent[]
}

function VideosPageFilters({
  kind,
  query,
  talentIds,
  talents,
}: VideosPageFiltersProps) {
  const selectedTalents = talents.filter((talent) =>
    talentIds.includes(talent.id),
  )

  return (
    <VideoFilters
      kind={kind}
      query={query}
      selectedTalents={selectedTalents}
      talents={talents}
    />
  )
}

export async function VideosPageHeading(
  props: PageProps<'/videos/[[...queries]]'>,
) {
  const [options, talents] = await Promise.all([
    getVideosPageOptions(props),
    fetchActiveTalents(),
  ])
  const { query, talentIds } = options
  const title = query ? `『${query}』の検索結果` : '動画一覧'
  const description =
    query || talentIds.length > 0 ? (
      <Suspense fallback={<ResultCountSkeleton />}>
        <ResultCount {...options} />
      </Suspense>
    ) : undefined

  return (
    <>
      <PageHeader
        breadcrumbs={
          query
            ? [{ href: '/videos', name: '動画一覧' }, { name: title }]
            : [{ name: '動画一覧' }]
        }
        description={description}
        title={title}
      />
      <VideosPageFilters {...options} talents={talents} />
    </>
  )
}

/** 1件もないときの案内 */
async function getNoResultsProps({
  kind,
  query,
  talentIds,
}: VideosPageOptions): Promise<ComponentProps<typeof NoResults>> {
  if (talentIds.length > 0) {
    return {
      clearFiltersHref: getVideosPath(query, kind),
      message: '条件に一致する動画は見つかりませんでした。',
    }
  }

  const kindName = getVideoKindName(kind)

  if (!query) {
    return { message: `${kindName}は見つかりませんでした。` }
  }

  return {
    hint: '別のキーワードや短いキーワードで検索するか、ひらがな・カタカナ・英字の表記を変えてお試しください。',
    message: `『${query}』に一致する${kindName}は見つかりませんでした。`,
    recommendedQueries: await getDisplayRecommendationQueries(),
  }
}

export async function VideosPageResults(
  props: PageProps<'/videos/[[...queries]]'>,
) {
  const options = await getVideosPageOptions(props)
  const { kind, query, talentIds } = options
  const [videos, referenceDate] = await Promise.all([
    fetchVideos({ kind, query, talentIds }),
    getReferenceDate(),
  ])
  const noResultsProps =
    videos.length > 0 ? undefined : await getNoResultsProps(options)
  // タレントで絞り込んでいるときは、人気のキーワードと結果が0件のキーワードの
  // 集計に入れない
  const shouldTrackQuery = query !== '' && talentIds.length === 0

  return (
    <>
      {shouldTrackQuery && (
        <>
          <SearchQueryTracker query={query} resultsCount={videos.length} />
          <SearchExitTracker hasResults={videos.length > 0} query={query} />
        </>
      )}
      {noResultsProps ? (
        <NoResults {...noResultsProps} />
      ) : (
        <SearchResults
          kind={kind}
          prefetchedData={[videos]}
          query={query}
          referenceDate={referenceDate}
          talentIds={talentIds}
        />
      )}
    </>
  )
}
