import { Skeleton } from '@shinju-date/ui'
import type { ReactNode } from 'react'
import { formatDateLabel, formatDateRange } from '../_lib/format-date'

interface WidgetHeaderProps {
  /** 見出しの右端に置く操作（エクスポートなど） */
  actions?: ReactNode
  /** 集計の期間。日付が選ばれているときは `selectedDate` を優先して示す */
  dateRange?: { startDate: string; endDate: string }
  description?: ReactNode
  selectedDate?: string | null
  title: ReactNode
}

/**
 * アナリティクスの各指標の見出し。見出し・集計の期間・説明・操作を同じ型で並べる。
 * グラフで選んだ日付に絞り込んでいるときは、期間を `text-accent` で示す。
 */
export function WidgetHeader({
  actions,
  dateRange,
  description,
  selectedDate,
  title,
}: WidgetHeaderProps) {
  return (
    <div className="mb-4 space-y-1">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-body leading-normal font-semibold">
          {title}
          {selectedDate ? (
            <span className="ml-2 text-meta font-normal text-accent">
              ({formatDateLabel(selectedDate)})
            </span>
          ) : (
            dateRange && (
              <span className="ml-2 text-meta font-normal text-muted">
                ({formatDateRange(dateRange)})
              </span>
            )
          )}
        </h3>
        {actions}
      </div>
      {description && <p className="text-meta text-muted">{description}</p>}
    </div>
  )
}

interface WidgetHeaderSkeletonProps {
  /** エクスポートのボタンを置く */
  actions?: boolean
  /** 見出しの横に集計の期間を置く */
  period?: boolean
  /** 見出し。読み込み後と同じ文言を渡す */
  title: ReactNode
}

/** 読み込み中の `WidgetHeader`。見出しは文字のまま描き、期間・説明・操作を `Skeleton` で描く */
export function WidgetHeaderSkeleton({
  actions = false,
  period = true,
  title,
}: WidgetHeaderSkeletonProps) {
  return (
    <div className="mb-4 space-y-1">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-body leading-normal font-semibold">
          {title}
          {period && (
            <Skeleton className="ml-2 inline-block h-4 w-40 align-middle" />
          )}
        </h3>
        {actions && <Skeleton className="h-7 w-28 shrink-0" />}
      </div>
      <div className="space-y-1 py-0.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
