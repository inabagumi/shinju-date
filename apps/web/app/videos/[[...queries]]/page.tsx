import { SITE_NAME as siteName } from '@shinju-date/constants'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchResultsSkeleton } from '@/components/search-results'
import { TALENT_SEARCH_PARAM } from '@/lib/talent-filter'
import { parseQueries } from '@/lib/url'
import {
  getVideosCalendarPath,
  getVideosPath,
  parseVideoKindFilter,
  VIDEO_KIND_SEARCH_PARAM,
} from '@/lib/video-kind-filter'
import {
  getSelectedTalentIds,
  VideosPageHeading,
  VideosPageHeadingSkeleton,
  VideosPageResults,
  type VideosPageSectionProps,
} from './_components/videos-page-sections'

export async function generateMetadata({
  params,
  searchParams,
}: VideosPageSectionProps): Promise<Metadata> {
  const [{ queries }, searchParamValues] = await Promise.all([
    params,
    searchParams,
  ])
  const query = parseQueries(queries)
  const talentIds = await getSelectedTalentIds(
    searchParamValues[TALENT_SEARCH_PARAM],
  )
  const kind = parseVideoKindFilter(searchParamValues[VIDEO_KIND_SEARCH_PARAM])
  const title = query ? `『${query}』の検索結果` : '動画一覧'

  return {
    alternates: {
      canonical: getVideosPath(query, 'all'),
      types: {
        'text/calendar': !query ? getVideosCalendarPath(kind, talentIds) : null,
      },
    },
    openGraph: {
      siteName,
      title,
      type: 'article',
    },
    robots: {
      // タレントでの絞り込みは検索結果と同じく、検索エンジンに載せない
      index: !query && talentIds.length === 0,
    },
    title,
    twitter: {
      title: `${title} - ${siteName}`,
    },
  }
}

export default function VideosPage({
  params,
  searchParams,
}: VideosPageSectionProps) {
  return (
    <>
      <Suspense fallback={<VideosPageHeadingSkeleton />}>
        <VideosPageHeading params={params} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<SearchResultsSkeleton />}>
        <VideosPageResults params={params} searchParams={searchParams} />
      </Suspense>
    </>
  )
}
