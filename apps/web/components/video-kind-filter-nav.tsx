import { twMerge } from '@shinju-date/ui'
import Link from 'next/link'
import {
  VIDEO_KIND_FILTER_OPTIONS,
  type VideoKindFilter,
} from '@/lib/video-kind-filter'

const PILL_CLASS_NAME =
  'inline-flex h-9 items-center rounded-full border px-4 text-meta font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** 選択中は `accent` の地に `accent-foreground` の文字 */
const SELECTED_PILL_CLASS_NAME =
  'border-accent bg-accent text-accent-foreground'

const UNSELECTED_PILL_CLASS_NAME =
  'border-border text-foreground hover:bg-muted'

interface VideoKindFilterNavProps {
  className?: string | undefined
  current: VideoKindFilter
  /** 種別ごとの切り替え先のパス。ほかの絞り込みの条件はここで残す */
  getPath: (kind: VideoKindFilter) => string
}

/**
 * 動画一覧・検索結果・タレント詳細の種別（すべて／動画／ショート）の切り替え。
 */
export default function VideoKindFilterNav({
  className,
  current,
  getPath,
}: VideoKindFilterNavProps) {
  return (
    <nav aria-label="種別" className={className}>
      <ul className="flex flex-wrap gap-2">
        {VIDEO_KIND_FILTER_OPTIONS.map((option) => {
          const isSelected = option.value === current

          return (
            <li key={option.value}>
              <Link
                aria-current={isSelected ? 'page' : undefined}
                className={twMerge(
                  PILL_CLASS_NAME,
                  isSelected
                    ? SELECTED_PILL_CLASS_NAME
                    : UNSELECTED_PILL_CLASS_NAME,
                )}
                href={getPath(option.value)}
              >
                {option.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function VideoKindFilterNavSkeleton() {
  return (
    <div aria-hidden="true" className="flex gap-2">
      {VIDEO_KIND_FILTER_OPTIONS.map((option) => (
        <div
          className="h-9 w-20 animate-pulse rounded-full bg-muted"
          key={option.value}
        />
      ))}
    </div>
  )
}
