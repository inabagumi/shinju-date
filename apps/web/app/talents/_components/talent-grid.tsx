import { EmptyState } from '@shinju-date/ui'
import { UsersRound } from 'lucide-react'
import type { TalentListItem, TalentStreamStatus } from '@/lib/fetchers'
import TalentCard, { TalentCardSkeleton } from './talent-card'

/** 3 columns, 4 from 640px, 5 from 768px and 6 from 1024px */
const GRID_CLASS_NAME =
  'grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-10 md:grid-cols-5 lg:grid-cols-6'

const SKELETON_COUNT = 12

interface TalentGridProps {
  /**
   * Whether each talent is live and when it streams next, keyed by the ID of
   * the talent. The order of the talents does not change with them.
   */
  streamStatuses?: Record<string, TalentStreamStatus> | undefined
  talents: TalentListItem[]
}

export default function TalentGrid({
  streamStatuses = {},
  talents,
}: TalentGridProps) {
  if (talents.length === 0) {
    return (
      <EmptyState icon={<UsersRound />} title="表示できるタレントがいません" />
    )
  }

  return (
    <ul className={GRID_CLASS_NAME}>
      {talents.map((talent) => (
        <li key={talent.id}>
          <TalentCard
            streamStatus={streamStatuses[talent.id]}
            talent={talent}
          />
        </li>
      ))}
    </ul>
  )
}

export function TalentGridSkeleton() {
  return (
    <ul aria-hidden="true" className={GRID_CLASS_NAME}>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 件数が決まっていて並びも変わらないスケルトンなので、インデックスをキーにする
        <li key={index}>
          <TalentCardSkeleton />
        </li>
      ))}
    </ul>
  )
}
