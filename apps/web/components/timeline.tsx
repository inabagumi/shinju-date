'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { twMerge } from '@shinju-date/ui'
import { type ReactNode, useId, useMemo } from 'react'
import type { Video } from '@/lib/fetchers'
import FormattedTime from './formatted-time'
import { useNow } from './timer'
import VideoCard, { VideoCardSkeleton } from './video-card'
import { VIDEO_CARD_LIST_CLASS_NAMES } from './video-card-list'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'] as const

/**
 * 日付見出しの文言。「今日」「明日」は言葉で、それ以降は日付と曜日で表す。
 * `toLocaleString` はネイティブの Temporal とポリフィルで出力が異なり、
 * ハイドレーションエラーの原因になるため使わない。
 */
export function formatTimelineDate(
  date: Temporal.PlainDate,
  today: Temporal.PlainDate,
): string {
  const days = today.until(date, { largestUnit: 'day' }).days

  if (days === 0) {
    return '今日'
  }

  if (days === 1) {
    return '明日'
  }

  const monthAndDay = formatDate(date, {
    includeYear: date.year !== today.year,
  })

  return `${monthAndDay}（${WEEKDAYS[date.dayOfWeek - 1]}）`
}

interface TimelineGroupProps {
  children: ReactNode
  heading: ReactNode
  labelledBy?: string | undefined
}

/**
 * 日付グループを縦のレール（タイムライン）でまとめ、
 * 日付見出しをカードグリッドの開始位置に揃えて表示する。
 * どの画面幅でも「日付 → 所属するカード」の順に並ぶため、
 * 1件のみのグループでも見出しとカードが離れない。
 */
function TimelineGroup({ children, heading, labelledBy }: TimelineGroupProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="relative border-l-2 border-border pb-2 pl-5 sm:pl-8"
      data-testid="timeline-group"
    >
      <span
        aria-hidden="true"
        className="absolute top-1.5 -left-1.75 size-3 rounded-full bg-accent ring-4 ring-background"
      />

      <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {heading}
      </header>

      {children}
    </section>
  )
}

const ITEM_CLASS_NAME = 'flex gap-3 sm:block'
const TIME_CLASS_NAME =
  'w-12 shrink-0 text-body leading-normal font-bold tabular-nums sm:hidden'

/**
 * 640px 未満では横型のカードの左に開始時刻を大きく置き、
 * カードの補助情報からは日時を外す。640px 以上では縦型のカードだけを並べる。
 */
function TimelineItem({ value }: { value: Video }) {
  const publishedAt = useMemo(
    () =>
      Temporal.Instant.from(value.published_at).toZonedDateTimeISO(TIME_ZONE),
    [value.published_at],
  )

  return (
    <div className={ITEM_CLASS_NAME}>
      <FormattedTime className={TIME_CLASS_NAME} dateTime={publishedAt} />

      <VideoCard
        className="min-w-0 flex-1"
        hideTimeOnMobile
        titleAs="h4"
        value={value}
        variant="row"
      />
    </div>
  )
}

function TimelineSection({
  dateTime: rawDateTime,
  items,
}: {
  dateTime: string
  items: Video[]
}) {
  const headingId = useId()
  const now = useNow()
  const dateTime = useMemo(
    () => Temporal.PlainDate.from(rawDateTime),
    [rawDateTime],
  )

  return (
    <TimelineGroup
      heading={
        <>
          <h3 className="text-body leading-normal font-semibold" id={headingId}>
            <time dateTime={dateTime.toJSON()}>
              {formatTimelineDate(dateTime, now.toPlainDate())}
            </time>
          </h3>
          <p className="text-meta text-muted tabular-nums">{items.length}件</p>
        </>
      }
      labelledBy={headingId}
    >
      <div className={VIDEO_CARD_LIST_CLASS_NAMES.row}>
        {items.map((item) => (
          <TimelineItem key={item.id} value={item} />
        ))}
      </div>
    </TimelineGroup>
  )
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-10">
      <TimelineGroup
        heading={
          <span className="inline-block h-6 w-24 animate-pulse rounded-control bg-muted" />
        }
      >
        <div className={VIDEO_CARD_LIST_CLASS_NAMES.row}>
          {Array.from({ length: 2 }, (_, index) => (
            <div aria-hidden="true" className={ITEM_CLASS_NAME} key={index}>
              <span
                className={twMerge(
                  TIME_CLASS_NAME,
                  'h-6 animate-pulse rounded-control bg-muted',
                )}
              />
              <VideoCardSkeleton className="min-w-0 flex-1" variant="row" />
            </div>
          ))}
        </div>
      </TimelineGroup>
    </div>
  )
}

/**
 * 配信予定を日付ごとにまとめ、各日の中は開始時刻の順に並べる。
 */
export default function Timeline({ videos }: { videos: Video[] }) {
  const schedule = useMemo<Map<string, Video[]>>(() => {
    const sortedValues = videos.toSorted((videoA, videoB) =>
      Temporal.Instant.compare(
        Temporal.Instant.from(videoA.published_at),
        Temporal.Instant.from(videoB.published_at),
      ),
    )
    return Map.groupBy(sortedValues, (value) =>
      Temporal.Instant.from(value.published_at)
        .toZonedDateTimeISO(TIME_ZONE)
        .toPlainDate()
        .toJSON(),
    )
  }, [videos])

  return (
    <div className="space-y-10">
      {[...schedule.entries()].map(([dateTime, items]) => (
        <TimelineSection dateTime={dateTime} items={items} key={dateTime} />
      ))}
    </div>
  )
}
