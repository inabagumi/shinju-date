import { buildSearchParamsHref } from '@/lib/search-params-href'
import type { VideoSortField, VideoSortOrder } from './get-videos'

/** 動画の一覧の並べ替え */
export interface VideoSort {
  field: VideoSortField
  order: VideoSortOrder
}

/**
 * 見出しの並べ替えのリンク先。今と同じ項目なら向きを反対にし、違う項目なら
 * 降順にする。ほかのパラメータ（絞り込み）は引き継ぎ、1ページ目に戻す
 *
 * @param searchParams 今のページの URL のパラメータ
 */
export function getVideoSortHref(
  searchParams: URLSearchParams | string,
  current: VideoSort,
  field: VideoSortField,
): string {
  return buildSearchParamsHref(
    '/videos',
    searchParams,
    current.field === field
      ? { sortOrder: current.order === 'asc' ? 'desc' : 'asc' }
      : { sortField: field, sortOrder: 'desc' },
  )
}

/** 並べ替えの向きを、見出しの `aria-sort` の値にする */
export function toAriaSort(order: VideoSortOrder): 'ascending' | 'descending' {
  return order === 'asc' ? 'ascending' : 'descending'
}
