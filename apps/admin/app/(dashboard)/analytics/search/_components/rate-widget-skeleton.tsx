import { Skeleton } from "@shinju-date/ui";

import { StatTileSkeleton } from "@/components/stat-tile-skeleton";

import { WidgetHeaderSkeleton } from "../../_components/widget-header";

interface RateWidgetSkeletonProps {
  /** 見出し。読み込み後と同じ文言を渡す */
  title: string;
}

/**
 * 読み込み中の、率を1つ出すウィジェット（`SearchEngagementRateWidget`・
 * `RepeatSearchRateWidget`）。見出し、値のタイル、4つの基準を並べる
 */
export function RateWidgetSkeleton({ title }: RateWidgetSkeletonProps) {
  return (
    <div aria-hidden="true">
      <WidgetHeaderSkeleton title={title} />
      <StatTileSkeleton />
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-0.5">
        <Skeleton className="col-span-2 h-4 w-16" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}
