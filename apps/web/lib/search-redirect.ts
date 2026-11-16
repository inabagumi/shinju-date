import { TALENT_SEARCH_PARAM } from './talent-filter'
import {
  getVideosPath,
  parseVideoKindFilter,
  VIDEO_KIND_SEARCH_PARAM,
} from './video-kind-filter'

/** 検索語を `q` で受け取る旧 URL のパス */
const LEGACY_SEARCH_PATHNAMES: readonly string[] = ['/search', '/videos']

/** 検索語を受け渡す旧 URL の検索パラメーターの名前 */
const LEGACY_QUERY_SEARCH_PARAM = 'q'

/**
 * 検索語を `q` で受け取る旧 URL（`/search?q=` と `/videos?q=`）の転送先の
 * パス。転送しない URL では `undefined` を返す。
 *
 * 複数の `q` は空白でつないで1つの検索語にする。種別とタレントの絞り込みは
 * そのまま引き継ぐ。
 */
export function getLegacySearchRedirectPath(url: URL): string | undefined {
  const { pathname, searchParams } = url

  if (!LEGACY_SEARCH_PATHNAMES.includes(pathname)) {
    return undefined
  }

  // `/videos` は `q` がないときにそのまま表示する
  if (pathname === '/videos' && !searchParams.has(LEGACY_QUERY_SEARCH_PARAM)) {
    return undefined
  }

  const query = searchParams
    .getAll(LEGACY_QUERY_SEARCH_PARAM)
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ')

  return getVideosPath(
    query,
    parseVideoKindFilter(
      searchParams.get(VIDEO_KIND_SEARCH_PARAM) ?? undefined,
    ),
    searchParams.getAll(TALENT_SEARCH_PARAM),
  )
}
