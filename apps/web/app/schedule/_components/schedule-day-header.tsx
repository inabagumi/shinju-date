'use client'

import { twMerge } from '@shinju-date/ui'
import { useMemo, useSyncExternalStore } from 'react'
import { useNow } from '@/components/timer'
import { formatScheduleDay } from '@/lib/schedule'

function subscribeNothing() {
  return () => {}
}

/**
 * 今日の日付。サーバーでの描画とハイドレーションでは `null` を返し、
 * ハイドレーションの後にブラウザの現在時刻で決める。週のデータはキャッシュ
 * するため、キャッシュを作った時点の「今日」を使うと、日付が変わった後に
 * 印がずれる。
 */
function useToday(): Temporal.PlainDate | null {
  const now = useNow()
  const isHydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )

  return isHydrated ? now.toPlainDate() : null
}

interface ScheduleDayHeaderProps {
  count: number
  /** `YYYY-MM-DD` */
  date: string
  headingId: string
}

/**
 * 1日ぶんの見出し。日付と曜日、件数を出し、今日は紫の線と「今日」の印で示す。
 */
export default function ScheduleDayHeader({
  count,
  date: rawDate,
  headingId,
}: ScheduleDayHeaderProps) {
  const today = useToday()
  const date = useMemo(() => Temporal.PlainDate.from(rawDate), [rawDate])
  const isToday = today?.equals(date) ?? false

  return (
    <header
      className={twMerge(
        'mb-3 flex items-baseline justify-between gap-2 border-b-2 pb-1 lg:flex-col lg:items-start lg:gap-0',
        isToday ? 'border-accent' : 'border-border',
      )}
      data-today={isToday || undefined}
    >
      <h3
        className={twMerge(
          'flex flex-wrap items-center gap-x-2 text-body leading-normal font-semibold tabular-nums',
          isToday && 'text-accent',
        )}
        id={headingId}
      >
        <time
          aria-current={isToday ? 'date' : undefined}
          dateTime={date.toString()}
        >
          {formatScheduleDay(date)}
        </time>

        {isToday && (
          <span className="rounded-full bg-accent px-2 text-caption font-semibold text-accent-foreground">
            今日
          </span>
        )}
      </h3>

      <p className="text-meta text-muted tabular-nums">{count}件</p>
    </header>
  )
}
