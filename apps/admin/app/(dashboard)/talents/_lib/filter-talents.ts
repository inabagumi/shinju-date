import type { TalentSearchParams } from './search-params-schema'
import type { TalentStatusFilter } from './talent-list-filters'

/** 絞り込みと並べ替えに使う、タレントの項目 */
interface FilterableTalent {
  id: string
  name: string
  deleted_at: string | null
  status: string
  updated_at: string
}

function matchesStatus(
  talent: FilterableTalent,
  filter: TalentStatusFilter,
): boolean {
  const isDeleted = talent.deleted_at !== null

  switch (filter) {
    case 'all':
      return true
    case 'deleted':
      return isDeleted
    case 'active':
      return !isDeleted && talent.status === 'active'
    case 'retired':
      return !isDeleted && talent.status === 'retired'
    case 'not_deleted':
      return !isDeleted
  }
}

/**
 * タレントの一覧を、URL のパラメータで絞り込み、最終更新日時で並べ替える。
 *
 * - `status`: 状態で絞り込む
 * - `search`: 名前か ID に含むもの（大文字と小文字を区別しない）
 * - `sort`: 最終更新日時の向き
 */
export function filterTalents<T extends FilterableTalent>(
  talents: readonly T[],
  { search, sort, status }: TalentSearchParams,
): T[] {
  const query = search?.toLowerCase()

  return talents
    .filter(
      (talent) =>
        matchesStatus(talent, status) &&
        (query === undefined ||
          talent.name.toLowerCase().includes(query) ||
          talent.id.toLowerCase().includes(query)),
    )
    .sort((a, b) => {
      const order = Temporal.Instant.compare(
        Temporal.Instant.from(a.updated_at),
        Temporal.Instant.from(b.updated_at),
      )

      return sort === 'desc' ? -order : order
    })
}
