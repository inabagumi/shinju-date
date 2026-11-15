import { EmptyState } from '@shinju-date/ui'
import { UsersRound } from 'lucide-react'
import Link from 'next/link'
import TalentIcon from '@/components/talent-icon'
import { fetchTalentSummaries, type TalentSummary } from '@/lib/fetchers'
import { getTalentPath } from '@/lib/talent-links'

const GRID_CLASS_NAME =
  'grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-10 md:grid-cols-5 lg:grid-cols-6'

/** The icon is 80px, 96px from 640px and 112px from 1024px */
const ICON_CLASS_NAME = 'size-20 sm:size-24 lg:size-28'
const ICON_SIZES = '(min-width: 1024px) 112px, (min-width: 640px) 96px, 80px'

interface TalentCardProps {
  talent: TalentSummary
}

/** A talent on the list: the icon and the name, linking to its page */
export function TalentCard({ talent }: TalentCardProps) {
  return (
    <Link
      className="group flex flex-col items-center gap-2 rounded-container text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      href={getTalentPath(talent.id)}
    >
      <TalentIcon
        className={ICON_CLASS_NAME}
        imageClassName="motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
        sizes={ICON_SIZES}
        talent={talent}
      />
      <span className="max-w-full text-body leading-normal font-semibold wrap-anywhere group-hover:underline">
        {talent.name}
      </span>
    </Link>
  )
}

interface TalentGridProps {
  talents: TalentSummary[]
}

export function TalentGrid({ talents }: TalentGridProps) {
  if (talents.length === 0) {
    return (
      <EmptyState icon={<UsersRound />} title="表示できるタレントはいません" />
    )
  }

  return (
    <ul className={GRID_CLASS_NAME} data-testid="talent-list">
      {talents.map((talent) => (
        <li key={talent.id}>
          <TalentCard talent={talent} />
        </li>
      ))}
    </ul>
  )
}

export async function TalentList() {
  const talents = await fetchTalentSummaries()

  return <TalentGrid talents={talents} />
}

export function TalentListSkeleton() {
  return (
    <ul aria-hidden="true" className={GRID_CLASS_NAME}>
      {Array.from({ length: 12 }, (_, index) => (
        <li className="flex flex-col items-center gap-2" key={index}>
          <div
            className={`${ICON_CLASS_NAME} animate-pulse rounded-full bg-muted`}
          />
          <div className="h-[1lh] w-3/4 animate-pulse rounded-control bg-muted text-body leading-normal" />
        </li>
      ))}
    </ul>
  )
}

/** The number of talents on the list, such as `18人` */
export async function TalentCount() {
  const talents = await fetchTalentSummaries()

  return <p className="tabular-nums">{talents.length}人</p>
}

export function TalentCountSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-[1lh] w-12 animate-pulse rounded-control bg-muted"
    />
  )
}
