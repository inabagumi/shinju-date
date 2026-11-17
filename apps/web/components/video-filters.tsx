import { CalendarPlus, X } from 'lucide-react'
import Link from 'next/link'
import type { Talent } from '@/lib/fetchers'
import {
  getVideosCalendarPath,
  getVideosPath,
  type VideoKindFilter,
} from '@/lib/video-kind-filter'
import TalentChip, { TALENT_CHIP_REMOVE_CLASS_NAME } from './talent-chip'
import TalentFilter from './talent-filter'
import { TextLink, TextLinkIcon } from './text-link'
import VideoKindFilterNav, {
  VideoKindFilterNavSkeleton,
} from './video-kind-filter-nav'

interface SelectedTalentListProps {
  kind: VideoKindFilter
  query: string
  selectedTalents: Talent[]
}

/**
 * 選んでいるタレントを、1人ずつ外せるチップで並べる。2人以上のときは
 * まとめて外すリンクも出す。
 */
function SelectedTalentList({
  kind,
  query,
  selectedTalents,
}: SelectedTalentListProps) {
  const selectedIds = selectedTalents.map((talent) => talent.id)

  return (
    <ul aria-label="選んでいるタレント" className="flex flex-wrap gap-2">
      {selectedTalents.map((talent) => (
        <TalentChip key={talent.id} name={talent.name}>
          <Link
            aria-label={`${talent.name}を外す`}
            className={TALENT_CHIP_REMOVE_CLASS_NAME}
            href={getVideosPath(
              query,
              kind,
              selectedIds.filter((id) => id !== talent.id),
            )}
            scroll={false}
          >
            <X aria-hidden="true" className="size-4" />
          </Link>
        </TalentChip>
      ))}
      {selectedTalents.length > 1 && (
        <li className="inline-flex h-8 items-center">
          <Link
            className="rounded-control px-1 text-meta text-accent focus-ring hover:underline"
            href={getVideosPath(query, kind)}
            scroll={false}
          >
            絞り込みを解除
          </Link>
        </li>
      )}
    </ul>
  )
}

interface VideoFiltersProps {
  kind: VideoKindFilter
  query: string
  /** 選んでいるタレント。`talents` の並びに合わせておく */
  selectedTalents: Talent[]
  /** 選択肢にする活動中のタレント */
  talents: Talent[]
}

/**
 * 動画一覧と検索結果の絞り込み。種別の切り替えとタレントの複数選択を
 * 1行に並べ、収まらないときは折り返す。キーワードがないときは、同じ条件の
 * カレンダーへのリンクも並べる。
 */
export default function VideoFilters({
  kind,
  query,
  selectedTalents,
  talents,
}: VideoFiltersProps) {
  const selectedIds = selectedTalents.map((talent) => talent.id)

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <VideoKindFilterNav
          current={kind}
          getPath={(value) => getVideosPath(query, value, selectedIds)}
        />
        <TalentFilter
          kind={kind}
          query={query}
          talents={talents}
          value={selectedIds}
        />
        {!query && (
          // カレンダーはページではないので、`next/link` のリンクにしない
          <TextLink
            className="h-9 px-1 text-meta"
            href={getVideosCalendarPath(kind, selectedIds)}
          >
            <TextLinkIcon>
              <CalendarPlus />
            </TextLinkIcon>
            カレンダーに登録
          </TextLink>
        )}
      </div>
      {selectedTalents.length > 0 && (
        <SelectedTalentList
          kind={kind}
          query={query}
          selectedTalents={selectedTalents}
        />
      )}
    </div>
  )
}

export function VideoFiltersSkeleton() {
  return (
    <div aria-hidden="true" className="mb-6 flex flex-wrap gap-2">
      <VideoKindFilterNavSkeleton />
      <div className="h-9 w-40 animate-pulse rounded-full bg-muted" />
    </div>
  )
}
