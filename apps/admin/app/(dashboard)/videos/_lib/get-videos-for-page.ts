import { getVideos, type Video } from './get-videos'
import {
  defaultVideoSearchParams,
  videoSearchParamsSchema,
} from './search-params-schema'

/** 動画一覧の1ページに出す動画の数 */
export const VIDEOS_PER_PAGE = 20

export interface VideosForPage {
  currentPage: number
  total: number
  totalPages: number
  videos: Video[]
}

/**
 * 動画一覧のページの検索のパラメータを検証し、そのページの動画を取得する。
 * 正しくないパラメータは、スキーマの既定値として扱う。
 *
 * `getVideos` は `'use cache: private'` の取得関数なので、同じパラメータで
 * 呼ぶ部品（件数と表）は、1回の表示で同じ結果を使う
 */
export async function getVideosForPage(
  searchParams: PageProps<'/videos'>['searchParams'],
): Promise<VideosForPage> {
  const result = videoSearchParamsSchema.safeParse(await searchParams)
  const { page, sortField, sortOrder, ...filters } = result.success
    ? result.data
    : defaultVideoSearchParams

  const { total, videos } = await getVideos(
    page,
    VIDEOS_PER_PAGE,
    filters,
    sortField,
    sortOrder,
  )

  return {
    currentPage: page,
    total,
    totalPages: Math.ceil(total / VIDEOS_PER_PAGE),
    videos,
  }
}
