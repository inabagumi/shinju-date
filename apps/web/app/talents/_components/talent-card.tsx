import { twMerge } from "@shinju-date/ui";
import Link from "next/link";

import LiveBadge from "@/components/live-badge";
import TalentIcon from "@/components/talent-icon";
import {
  LIVE_RING_CLASS_NAME,
  NextStream,
} from "@/components/talent-stream-status";
import type { TalentListItem, TalentStreamStatus } from "@/lib/data/talents";
import { getTalentPath } from "@/lib/talent-links";

/** The size of the icon: 80px, 96px from 640px, and 112px from 1024px */
const ICON_CLASS_NAME = "size-20 sm:size-24 lg:size-28";
const ICON_SIZES = "(min-width: 1024px) 112px, (min-width: 640px) 96px, 80px";

interface TalentCardProps {
  /** Whether the talent is live and when it streams next, if known */
  streamStatus?: TalentStreamStatus | undefined;
  talent: TalentListItem;
}

/**
 * A talent in the list of talents: the round icon with the name below it,
 * linking to the talent's page. It has no background, border or shadow.
 *
 * A talent that is live gets a ring around the icon and a badge, and one with
 * a stream within a week gets its start below the name. The link is named by
 * the name of the talent alone, and these are its description.
 */
export default function TalentCard({ streamStatus, talent }: TalentCardProps) {
  const isLive = streamStatus?.isLive ?? false;
  const nextStreamAt = isLive ? null : (streamStatus?.nextStreamAt ?? null);
  const nameId = `talent-${talent.id}-name`;
  const statusId = `talent-${talent.id}-status`;

  return (
    <Link
      aria-describedby={isLive || nextStreamAt ? statusId : undefined}
      aria-labelledby={nameId}
      className="group flex flex-col items-center gap-2 rounded-container text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      href={getTalentPath(talent.id)}
    >
      <span className="relative flex motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105">
        <TalentIcon
          className={twMerge(ICON_CLASS_NAME, isLive && LIVE_RING_CLASS_NAME)}
          sizes={ICON_SIZES}
          talent={talent}
        />
        {isLive && (
          <LiveBadge
            className="absolute -bottom-1 left-1/2 -translate-x-1/2"
            id={statusId}
          />
        )}
      </span>
      <span className="flex w-full flex-col items-center gap-0.5">
        <span
          className="w-full text-body leading-normal font-semibold wrap-anywhere group-hover:underline"
          id={nameId}
        >
          {talent.name}
        </span>
        {nextStreamAt && <NextStream id={statusId} startsAt={nextStreamAt} />}
      </span>
    </Link>
  );
}

export function TalentCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${ICON_CLASS_NAME} shrink-0 animate-pulse rounded-full bg-muted`}
      />
      <div className="h-[1lh] w-3/4 animate-pulse rounded-control bg-muted text-body leading-normal" />
    </div>
  );
}
