import { twMerge } from "@shinju-date/ui";
import type { ComponentPropsWithoutRef } from "react";

import type { Video } from "@/lib/data/videos";

import VideoCard, {
  VideoCardSkeleton,
  type VideoCardVariant,
} from "./video-card";

type VideoCardListVariant = Exclude<VideoCardVariant, "short">;

/**
 * 横型（`row`）のカードは 640px 未満で1画面に4〜5件見えるよう、間隔を詰める。
 */
export const VIDEO_CARD_LIST_CLASS_NAMES: Record<VideoCardListVariant, string> =
  {
    grid: "grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3",
    row: "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3",
  };

interface VideoCardListSkeletonProps {
  className?: string | undefined;
  count?: number;
  /** 画面幅によってスケルトンを隠すときなどに、項目ごとのクラスを返す */
  itemClassName?: (index: number) => string | undefined;
  variant?: VideoCardListVariant;
}

export function VideoCardListSkeleton({
  className,
  count = 2,
  itemClassName,
  variant = "row",
}: VideoCardListSkeletonProps) {
  return (
    <div className={twMerge(VIDEO_CARD_LIST_CLASS_NAMES[variant], className)}>
      {Array.from({ length: count }, (_, index) => (
        <VideoCardSkeleton
          className={itemClassName?.(index)}
          key={index}
          variant={variant}
        />
      ))}
    </div>
  );
}

interface VideoCardListProps extends Omit<
  ComponentPropsWithoutRef<typeof VideoCard>,
  "className" | "value" | "variant"
> {
  className?: string | undefined;
  values: Video[];
  variant?: VideoCardListVariant;
}

export default function VideoCardList({
  className,
  values,
  variant = "row",
  ...props
}: VideoCardListProps) {
  return (
    <div className={twMerge(VIDEO_CARD_LIST_CLASS_NAMES[variant], className)}>
      {values.map((value) => (
        <VideoCard key={value.id} value={value} variant={variant} {...props} />
      ))}
    </div>
  );
}
