import { Skeleton, twMerge } from "@shinju-date/ui";

interface StatTileSkeletonProps {
  /** 前日比などの変化の行を置く */
  change?: boolean;
  className?: string;
}

/** 読み込み中の `StatTile`。枠は `StatTile` と同じにし、ラベル・値・変化の行を `Skeleton` で描く */
export function StatTileSkeleton({
  change = false,
  className,
}: StatTileSkeletonProps) {
  return (
    <div
      className={twMerge(
        "flex flex-col gap-1 rounded-container border border-border bg-surface p-4",
        className
      )}
    >
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-8 w-24" />
      {change && <Skeleton className="h-4 w-28" />}
    </div>
  );
}
