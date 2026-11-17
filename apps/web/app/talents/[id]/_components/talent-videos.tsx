import NoResults from '@/components/no-results'
import SearchResults from '@/components/search-results'
import VideoKindFilterNav, {
  VideoKindFilterNavSkeleton,
} from '@/components/video-kind-filter-nav'
import { fetchVideos } from '@/lib/fetchers'
import { getReferenceDate } from '@/lib/reference-date'
import { getTalentPath } from '@/lib/talent-links'
import {
  getVideoKindName,
  parseVideoKindFilter,
  VIDEO_KIND_SEARCH_PARAM,
  type VideoKindFilter,
} from '@/lib/video-kind-filter'
import { getShownTalent, type TalentPageParams } from '../_lib/get-shown-talent'

export interface TalentVideosProps {
  params: TalentPageParams
  searchParams: PageProps<'/talents/[id]'>['searchParams']
}

async function getKind(
  searchParams: TalentVideosProps['searchParams'],
): Promise<VideoKindFilter> {
  const searchParamValues = await searchParams

  return parseVideoKindFilter(searchParamValues[VIDEO_KIND_SEARCH_PARAM])
}

/**
 * タレントの動画の種別の切り替え。リンク先はタレント詳細にとどまる。
 */
export async function TalentVideoKindFilterNav({
  params,
  searchParams,
}: TalentVideosProps) {
  const [talent, kind] = await Promise.all([
    getShownTalent(params),
    getKind(searchParams),
  ])

  return (
    <VideoKindFilterNav
      className="mb-6"
      current={kind}
      getPath={(value) => getTalentPath(talent.id, value)}
    />
  )
}

export function TalentVideoKindFilterNavSkeleton() {
  return (
    <div className="mb-6">
      <VideoKindFilterNavSkeleton />
    </div>
  )
}

/**
 * タレントの動画を、動画一覧と同じ日付ごとの並びで表示する。
 */
export async function TalentVideos({
  params,
  searchParams,
}: TalentVideosProps) {
  const [talent, kind] = await Promise.all([
    getShownTalent(params),
    getKind(searchParams),
  ])
  const talentIds = [talent.id]
  const [videos, referenceDate] = await Promise.all([
    fetchVideos({ kind, talentIds }),
    getReferenceDate(),
  ])

  if (videos.length < 1) {
    return (
      <NoResults
        message={`${getVideoKindName(kind)}は見つかりませんでした。`}
      />
    )
  }

  return (
    <SearchResults
      kind={kind}
      prefetchedData={[videos]}
      referenceDate={referenceDate}
      talentIds={talentIds}
    />
  )
}
