import type { Talent } from '@/lib/data/talents'

/**
 * 照合に使う形に揃える。NFKC で全角・半角の違いをなくし、小文字にする。
 */
export function normalizeForTalentMatch(value: string): string {
  return value.normalize('NFKC').toLowerCase()
}

/**
 * 入力した文字を名前に含むタレントを、`talents` の並びのまま返す。
 * 全角・半角と大文字・小文字の違いは無視する。`excludedIds` のタレントは
 * 返さない。
 */
export function findMatchingTalents(
  talents: readonly Talent[],
  query: string,
  excludedIds: readonly string[] = [],
): Talent[] {
  const normalizedQuery = normalizeForTalentMatch(query).trim()

  if (!normalizedQuery) {
    return []
  }

  const excluded = new Set(excludedIds)

  return talents.filter(
    (talent) =>
      !excluded.has(talent.id) &&
      normalizeForTalentMatch(talent.name).includes(normalizedQuery),
  )
}
