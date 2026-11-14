import type { Tables } from '@shinju-date/database'

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

/**
 * 動画一覧（または検索結果）を種別で絞り込んだページのパス。
 */
export function getVideosPath(query: string, filter: VideoKindFilter): string {
  const pathname = query ? `/videos/${encodeURIComponent(query)}` : '/videos'

  if (filter === 'all') {
    return pathname
  }

  return `${pathname}?${new URLSearchParams({ [VIDEO_KIND_SEARCH_PARAM]: filter })}`
}
