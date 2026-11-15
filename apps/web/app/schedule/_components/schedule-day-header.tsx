'use client'

import { useMemo } from 'react'
import { useToday } from '@/components/use-today'
import { formatScheduleDay } from '@/lib/schedule'

interface ScheduleDayHeaderProps {
  count: number
  /** `YYYY-MM-DD` */
  date: string
  headingId: string
  /**
   * サーバーで描画したときの今日（`YYYY-MM-DD`）。ハイドレーションまでの
   * 「今日」の基準で、その後はブラウザの現在時刻を使う
   */
  referenceDate: string
}

/**
 * 1日ぶんの見出し。日付と曜日、件数を出し、今日は「今日」の文字の印で示す。
 * スクロールしても日付がわかるよう、サイトのヘッダー（高さ 56px）の下に固定する。
 * 1024px 以上では見出しの行がまとめて固定され、狭い画面ではその日のセクションの
 * 中でだけ固定される。
 */
export default function ScheduleDayHeader({
  count,
  date: rawDate,
  headingId,
  referenceDate,
}: ScheduleDayHeaderProps) {
  const today = useToday(referenceDate)
  const date = useMemo(() => Temporal.PlainDate.from(rawDate), [rawDate])
  const isToday = today.equals(date)

  return (
    <header
      className="sticky top-14 z-10 flex items-baseline gap-x-2 border-b border-border bg-background pt-2 pb-1 lg:flex-col lg:gap-0"
      data-today={isToday || undefined}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2
          className="text-body leading-normal font-semibold tabular-nums"
          id={headingId}
        >
          <time
            aria-current={isToday ? 'date' : undefined}
            dateTime={date.toString()}
          >
            {formatScheduleDay(date)}
          </time>
        </h2>

        {isToday && (
          <span className="text-caption font-semibold text-accent">今日</span>
        )}
      </div>

      {/* 7日を横に並べる幅では、隣の日の見出しと混ざらないよう件数を下の行に置く */}
      <p className="ml-auto text-meta text-muted tabular-nums lg:ml-0">
        {count}件
      </p>
    </header>
  )
}
