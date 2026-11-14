'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { twMerge } from '@shinju-date/ui'
import { type ReactNode, useId, useMemo, useSyncExternalStore } from 'react'
import FormattedTime from '@/components/formatted-time'
import { useNow } from '@/components/timer'
import VideoCard, { VideoCardSkeleton } from '@/components/video-card'
import { VIDEO_CARD_LIST_CLASS_NAMES } from '@/components/video-card-list'
import type { Video } from '@/lib/fetchers'

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

function subscribeNothing() {
  return () => {}
}

/**
 * 「今日」「明日」を判定する基準の日付。
 * サーバーでの描画とハイドレーションでは、データと一緒に取得した `referenceDate` を使い、
 * 両者の文言を揃える。ハイドレーションの後はブラウザの現在時刻に切り替えるため、
 * キャッシュを作った後に日付が変わっていても正しい文言になる。
 */
function useToday(referenceDate: string): Temporal.PlainDate {
  const now = useNow()
  const isHydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )

  return useMemo(
    () =>
      isHydrated ? now.toPlainDate() : Temporal.PlainDate.from(referenceDate),
    [isHydrated, now, referenceDate],
  )
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

interface TimelineSectionProps {
  dateTime: string
  items: Video[]
  today: Temporal.PlainDate
}

function TimelineSection({
  dateTime: rawDateTime,
  items,
  today,
}: TimelineSectionProps) {
  const headingId = useId()
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
              {formatTimelineDate(dateTime, today)}
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
interface TimelineProps {
  /** サーバーで描画したときの日付（`YYYY-MM-DD`）。ハイドレーションまでの「今日」の基準 */
  referenceDate: string
  videos: Video[]
}

export default function Timeline({ referenceDate, videos }: TimelineProps) {
  const today = useToday(referenceDate)
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
        <TimelineSection
          dateTime={dateTime}
          items={items}
          key={dateTime}
          today={today}
        />
      ))}
    </div>
  )
}
