import { twMerge } from '@shinju-date/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { NAVIGATION_LINK_CLASS_NAME } from '@/lib/class-names'
import { WEEKDAYS } from '@/lib/date-heading'
import { fetchScheduleVideos, type ScheduleVideo } from '@/lib/fetchers'
import { groupVideosByDate } from '@/lib/group-videos-by-date'
import {
  formatWeekRange,
  getSchedulePath,
  getWeekDays,
  isWeekInRange,
  layoutDay,
  type ScheduleLayout,
} from '@/lib/schedule'
import {
  resolveScheduleWeek,
  type SchedulePageParams,
} from '../_lib/resolve-schedule-week'
import ScheduleDayHeader from './schedule-day-header'
import ScheduleItem, {
  getScheduleVideoUrl,
  getTitleLines,
  ScheduleItemSkeleton,
} from './schedule-item'

export interface ScheduleWeekSectionProps {
  /** `/schedule` では渡さず、今日を含む週を表示する */
  params?: SchedulePageParams | undefined
}

function getDayId(date: Temporal.PlainDate): string {
  return `day-${date.toString()}`
}

/** 週の範囲と、前の週・今週・次の週へのリンク */
const WEEK_NAVIGATION_CLASS_NAME =
  'mb-6 flex min-h-[1lh] flex-wrap items-center justify-between gap-x-6 gap-y-3 text-heading'

export async function ScheduleWeekNavigation({
  params,
}: ScheduleWeekSectionProps) {
  const { range, weekStart } = await resolveScheduleWeek(params)
  const previousWeek = weekStart.subtract({ weeks: 1 })
  const nextWeek = weekStart.add({ weeks: 1 })

  return (
    <div className={WEEK_NAVIGATION_CLASS_NAME}>
      <p className="font-bold tabular-nums">
        <time dateTime={weekStart.toString()}>
          {formatWeekRange(weekStart, { withWeekdays: true })}
        </time>
      </p>

      <nav aria-label="週の移動">
        <ul className="flex items-center gap-4 text-meta">
          {/* 表示できない週へのリンクは出さない */}
          {isWeekInRange(previousWeek, range) && (
            <li>
              <Link
                className={NAVIGATION_LINK_CLASS_NAME}
                href={getSchedulePath(previousWeek)}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                前の週
              </Link>
            </li>
          )}
          <li>
            <Link
              className={NAVIGATION_LINK_CLASS_NAME}
              href={getSchedulePath()}
            >
              今週
            </Link>
          </li>
          {isWeekInRange(nextWeek, range) && (
            <li>
              <Link
                className={NAVIGATION_LINK_CLASS_NAME}
                href={getSchedulePath(nextWeek)}
              >
                次の週
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </div>
  )
}

export function ScheduleWeekNavigationSkeleton() {
  return (
    <div aria-hidden="true" className={WEEK_NAVIGATION_CLASS_NAME}>
      <span className="inline-block h-[1lh] w-80 max-w-full animate-pulse rounded-control bg-muted" />
      <span className="inline-block h-4 w-40 animate-pulse rounded-control bg-muted" />
    </div>
  )
}

const WEEKDAY_BAND_CLASS_NAME = 'mb-6 grid grid-cols-7 gap-1 lg:hidden'

/**
 * 1024px 未満で、日付ごとのセクションへ飛ぶページ内リンク（「月 9」「火 10」…）。
 */
export async function ScheduleWeekdayBand({
  params,
}: ScheduleWeekSectionProps) {
  const { weekStart } = await resolveScheduleWeek(params)

  return (
    <nav aria-label="曜日">
      <ul className={WEEKDAY_BAND_CLASS_NAME}>
        {getWeekDays(weekStart).map((date) => (
          <li key={date.toString()}>
            <a
              className="flex flex-col items-center rounded-control py-1 text-meta tabular-nums hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href={`#${getDayId(date)}`}
            >
              <span className="text-caption text-muted">
                {WEEKDAYS[date.dayOfWeek - 1]}
              </span>
              <span className="font-semibold">{date.day}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ScheduleWeekdayBandSkeleton() {
  return (
    <div aria-hidden="true" className={WEEKDAY_BAND_CLASS_NAME}>
      {Array.from({ length: 7 }, (_, index) => (
        <span
          className="h-11 animate-pulse rounded-control bg-muted"
          key={index}
        />
      ))}
    </div>
  )
}

/**
 * 1024px 以上では、時刻の列と7日の列を並べ、各列は CSS の subgrid で見出しの
 * 行と本体の行を共有する。本体は1時間を `--hour` の高さにした24時間の軸で、
 * 項目は開始時刻の位置に、長さぶんの高さで置く。1024px 未満では日付ごとの
 * セクションを縦に積み、項目を開始時刻の順に並べる。
 */
const DAYS_CLASS_NAME =
  'space-y-8 [--hour:4rem] lg:grid lg:grid-cols-[auto_repeat(7,minmax(0,1fr))] lg:grid-rows-[auto_auto] lg:gap-x-2 lg:space-y-0'
// `grid-cols-1` は `minmax(0, 1fr)` の1列。列幅を指定しないと、長いチャンネル名
// やタイトルに合わせて列が広がり、隣の日にはみ出す
const COLUMN_CLASS_NAME =
  'lg:row-span-2 lg:grid lg:grid-cols-1 lg:grid-rows-subgrid'
/** 24時間の本体。1時間ごとに区切りの線を引く */
const BODY_CLASS_NAME =
  'lg:relative lg:h-[calc(var(--hour)*24)] lg:bg-[repeating-linear-gradient(to_bottom,var(--color-border)_0,var(--color-border)_1px,transparent_1px,transparent_var(--hour))]'

/** 0時から23時までの24時間 */
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

function formatHour(hour: number): string {
  return `${hour.toString(10).padStart(2, '0')}:00`
}

/** 日の列の間の余白（`gap-x-2`） */
const DAY_GAP = '0.5rem'

/** 広げたときの最低の幅 */
const EXPANDED_MIN_WIDTH = '14rem'

/**
 * 項目を置く位置。`layoutDay` の結果を CSS 変数で渡し、1024px 以上だけ
 * クラスから参照する（狭い画面では使わない）。
 *
 * 広げたときの幅（`--expanded-width`）は、左端を動かさずに右へ伸ばす幅にする。
 * 日の列の右端まで、ただし `EXPANDED_MIN_WIDTH` より狭くはせず、週の右端
 * （右に残る日の列の分）は越えない。`100%` は日の列の幅を指す
 */
function getPlacementStyle(
  { column, columns, length, start }: ScheduleLayout<ScheduleVideo>,
  daysAfter: number,
): CSSProperties {
  const left = `(100% * ${column} / ${columns})`
  const toDayEnd = `(100% - ${left})`
  const toWeekEnd = `(${toDayEnd} + ${daysAfter} * (100% + ${DAY_GAP}))`

  return {
    '--column': column,
    '--columns': columns,
    '--expanded-width': `min(max(calc${toDayEnd}, ${EXPANDED_MIN_WIDTH}), calc${toWeekEnd})`,
    '--length': length,
    '--start': start,
  } as CSSProperties
}

/**
 * 1024px 以上で項目を置くクラス。マウスを乗せるかフォーカスすると、前面に出して
 * 左端はそのままに右へ広げ、高さも中身に合わせて伸ばす（配信の長さより低くは
 * しない）。項目は縦の flex で、この要素の高さいっぱいに広がる
 */
const PLACEMENT_CLASS_NAME =
  'group/item lg:absolute lg:top-[calc(var(--hour)*var(--start)/60)] lg:left-[calc(100%*var(--column)/var(--columns))] lg:flex lg:h-[calc(var(--hour)*var(--length)/60)] lg:w-[calc(100%/var(--columns))] lg:flex-col lg:pr-0.5 lg:pb-0.5 lg:focus-within:z-30 lg:focus-within:h-auto lg:focus-within:min-h-[calc(var(--hour)*var(--length)/60)] lg:focus-within:w-(--expanded-width) lg:hover:z-30 lg:hover:h-auto lg:hover:min-h-[calc(var(--hour)*var(--length)/60)] lg:hover:w-(--expanded-width)'

interface ScheduleDayProps {
  date: Temporal.PlainDate
  items: ScheduleVideo[]
  referenceDate: string
}

function ScheduleDay({ date, items, referenceDate }: ScheduleDayProps) {
  const id = getDayId(date)
  const headingId = `${id}-heading`

  return (
    <section
      aria-labelledby={headingId}
      className={twMerge(COLUMN_CLASS_NAME, 'min-w-0 scroll-mt-20')}
      data-testid="schedule-day"
      id={id}
    >
      <ScheduleDayHeader
        count={items.length}
        date={date.toString()}
        headingId={headingId}
        referenceDate={referenceDate}
      />

      <div className={BODY_CLASS_NAME}>
        {items.length > 0 ? (
          // 開始時刻の順に並ぶので、狭い画面ではそのまま縦に積む
          <ul className="mt-2 space-y-2 lg:mt-0 lg:space-y-0">
            {layoutDay(items).map((layout) => (
              <li
                className={PLACEMENT_CLASS_NAME}
                data-columns={layout.columns}
                key={layout.item.id}
                style={getPlacementStyle(layout, 6 - (date.dayOfWeek % 7))}
              >
                <ScheduleItem
                  titleLines={getTitleLines(layout.length)}
                  value={layout.item}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-meta text-muted lg:hidden">
            配信はありません
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * 1週間ぶんの配信と動画を、開始日時の日付ごとに、時刻の軸の上に並べる。動画が
 * ない日も日付は出す。
 */
export async function ScheduleDays({ params }: ScheduleWeekSectionProps) {
  const { today, weekStart } = await resolveScheduleWeek(params)
  // リンク先が作れない動画は表示しないので、件数にも入れない
  const videos = (await fetchScheduleVideos(weekStart.toString())).filter(
    (video) => getScheduleVideoUrl(video) !== null,
  )
  const groups = groupVideosByDate(videos)

  return (
    <div className={DAYS_CLASS_NAME}>
      <TimeColumn />

      {getWeekDays(weekStart).map((date) => (
        <ScheduleDay
          date={date}
          items={groups.get(date.toString()) ?? []}
          key={date.toString()}
          referenceDate={today.toString()}
        />
      ))}
    </div>
  )
}

/** 時刻の列。各項目にも開始時刻があるので、読み上げない */
function TimeColumn() {
  return (
    // ラベルは絶対配置で列の幅にならないので、幅を決めておく
    <div
      aria-hidden="true"
      className={twMerge(COLUMN_CLASS_NAME, 'hidden lg:w-12')}
    >
      {/* 日付の見出しと一緒に固定し、下を流れる時刻を隠す */}
      <span className="sticky top-14 z-40 bg-background" />
      <div className={twMerge(BODY_CLASS_NAME, 'lg:bg-none')}>
        {HOURS.map((hour) => (
          <span
            className="absolute right-1 -translate-y-1/2 text-caption text-muted tabular-nums first:translate-y-0"
            key={hour}
            style={{ top: `calc(var(--hour) * ${hour})` }}
          >
            {formatHour(hour)}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ScheduleDaysSkeleton() {
  return (
    <div aria-hidden="true" className={DAYS_CLASS_NAME}>
      <TimeColumn />

      {Array.from({ length: 7 }, (_, index) => (
        <div className={twMerge(COLUMN_CLASS_NAME, 'min-w-0')} key={index}>
          <div className="border-b border-border pb-1">
            <span className="inline-block h-[1lh] w-20 animate-pulse rounded-control bg-muted text-body" />
          </div>
          <div className={twMerge(BODY_CLASS_NAME, 'mt-2 space-y-2 lg:mt-0')}>
            <ScheduleItemSkeleton />
            <ScheduleItemSkeleton />
          </div>
        </div>
      ))}
    </div>
  )
}
