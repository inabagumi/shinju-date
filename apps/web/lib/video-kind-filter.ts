import type { Tables } from '@shinju-date/database'
import { normalizeTalentIds, TALENT_SEARCH_PARAM } from './talent-filter'

type VideoKind = Tables<'videos'>['video_kind']

/**
 * 動画一覧と検索結果の種別の切り替え。`all` はすべての種別を表す。
 */
export type VideoKindFilter = 'all' | VideoKind

interface VideoKindFilterOption {
  label: string
  value: VideoKindFilter
}

export const VIDEO_KIND_FILTER_OPTIONS: readonly VideoKindFilterOption[] = [
  { label: 'すべて', value: 'all' },
  { label: '動画', value: 'standard' },
  { label: 'ショート', value: 'short' },
]

/** 種別を URL で受け渡すときの検索パラメーターの名前 */
export const VIDEO_KIND_SEARCH_PARAM = 'kind'

/**
 * 検索パラメーターの値を種別に変換する。知らない値は `all` として扱う。
 */
export function parseVideoKindFilter(
  value: string | string[] | undefined,
): VideoKindFilter {
  const firstValue = Array.isArray(value) ? value[0] : value

  return (
    VIDEO_KIND_FILTER_OPTIONS.find((option) => option.value === firstValue)
      ?.value ?? 'all'
  )
}

/**
 * `search_videos_v3` の `video_kinds` に渡す値。`all` では絞り込まない。
 */
export function getVideoKinds(
  filter: VideoKindFilter,
): VideoKind[] | undefined {
  return filter === 'all' ? undefined : [filter]
}

function createFilterSearchParams(
  filter: VideoKindFilter,
  talentIds: readonly string[],
): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (filter !== 'all') {
    searchParams.append(VIDEO_KIND_SEARCH_PARAM, filter)
  }

  for (const talentId of normalizeTalentIds(talentIds)) {
    searchParams.append(TALENT_SEARCH_PARAM, talentId)
  }

  return searchParams
}

function appendSearchParams(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  return searchParams.size > 0 ? `${pathname}?${searchParams}` : pathname
}

/**
 * 動画一覧（または検索結果）を種別とタレントで絞り込んだページのパス。
 * タレントの ID は重複を除いて並べ替える。
 */
export function getVideosPath(
  query: string,
  filter: VideoKindFilter,
  talentIds: readonly string[] = [],
): string {
  const pathname = query ? `/videos/${encodeURIComponent(query)}` : '/videos'

  return appendSearchParams(
    pathname,
    createFilterSearchParams(filter, talentIds),
  )
}

/**
 * 動画一覧と同じ条件で絞り込んだカレンダーのパス。キーワードには対応しない。
 */
export function getVideosCalendarPath(
  filter: VideoKindFilter,
  talentIds: readonly string[] = [],
): string {
  return appendSearchParams(
    '/videos.ics',
    createFilterSearchParams(filter, talentIds),
  )
}

/**
 * 見つからなかったときに使う種別の呼び名。「すべて」では「動画」と呼ぶ。
 */
export function getVideoKindName(filter: VideoKindFilter): string {
  if (filter === 'all') {
    return '動画'
  }

  return (
    VIDEO_KIND_FILTER_OPTIONS.find((option) => option.value === filter)
      ?.label ?? '動画'
  )
}
