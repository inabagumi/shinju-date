import { isUUID } from './uuid'

/** タレントを URL で受け渡すときの検索パラメーターの名前 */
export const TALENT_SEARCH_PARAM = 'talent'

/**
 * タレントの ID を重複を除いて並べ替える。同じ条件の URL と取得関数の
 * キャッシュを揃えるために使う。
 */
export function normalizeTalentIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort()
}

/**
 * 検索パラメーターの値をタレントの ID に変換する。UUID の形式でない値と、
 * `activeTalentIds` に含まれない ID は無視する。
 */
export function parseTalentIds(
  value: string | string[] | undefined,
  activeTalentIds: readonly string[],
): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : []
  const activeIds = new Set(activeTalentIds)

  return normalizeTalentIds(
    values
      .filter(isUUID)
      .map((id) => id.toLowerCase())
      .filter((id) => activeIds.has(id)),
  )
}
