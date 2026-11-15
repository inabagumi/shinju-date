import Link from 'next/link'
import TalentIcon from '@/components/talent-icon'
import type { TalentListItem } from '@/lib/fetchers'
import { getTalentPath } from '@/lib/talent-links'

/** The size of the icon: 80px, 96px from 640px, and 112px from 1024px */
const ICON_CLASS_NAME = 'size-20 sm:size-24 lg:size-28'
const ICON_SIZES = '(min-width: 1024px) 112px, (min-width: 640px) 96px, 80px'

interface TalentCardProps {
  talent: TalentListItem
}

/**
 * A talent in the list of talents: the round icon with the name below it,
 * linking to the talent's page. It has no background, border or shadow.
 */
export default function TalentCard({ talent }: TalentCardProps) {
  return (
    <Link
      className="group flex flex-col items-center gap-2 rounded-container text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      href={getTalentPath(talent.id)}
    >
      <TalentIcon
        className={`${ICON_CLASS_NAME} motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105`}
        sizes={ICON_SIZES}
        talent={talent}
      />
      <span className="w-full text-body leading-normal font-semibold wrap-anywhere group-hover:underline">
        {talent.name}
      </span>
    </Link>
  )
}

export function TalentCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${ICON_CLASS_NAME} shrink-0 animate-pulse rounded-full bg-muted`}
      />
      <div className="h-[1lh] w-3/4 animate-pulse rounded-control bg-muted text-body leading-normal" />
    </div>
  )
}
