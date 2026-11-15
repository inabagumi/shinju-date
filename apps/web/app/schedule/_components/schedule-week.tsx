import { twMerge } from '@shinju-date/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { WEEKDAYS } from '@/lib/date-heading'
import { fetchScheduleVideos, type ScheduleVideo } from '@/lib/fetchers'
import { groupVideosByDate } from '@/lib/group-videos-by-date'
import {
  formatWeekRange,
  getSchedulePath,
  getStartHour,
  getStartHours,
  getWeekDays,
  isWeekInRange,
} from '@/lib/schedule'
import {
  resolveScheduleWeek,
  type SchedulePageParams,
} from '../_lib/resolve-schedule-week'
import ScheduleDayHeader from './schedule-day-header'
import ScheduleItem, {
  getScheduleVideoUrl,
  ScheduleItemSkeleton,
} from './schedule-item'

export interface ScheduleWeekSectionProps {
  /** `/schedule` では渡さず、今日を含む週を表示する */
  params?: SchedulePageParams | undefined
}

function getDayId(date: Temporal.PlainDate): string {
  return `day-${date.toString()}`
}

const LINK_CLASS_NAME =
  'inline-flex items-center gap-0.5 rounded-control font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

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
                className={LINK_CLASS_NAME}
                href={getSchedulePath(previousWeek)}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                前の週
              </Link>
            </li>
          )}
          <li>
            <Link className={LINK_CLASS_NAME} href={getSchedulePath()}>
              今週
            </Link>
          </li>
          {isWeekInRange(nextWeek, range) && (
            <li>
              <Link
                className={LINK_CLASS_NAME}
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
 * 1024px 以上では、時刻の列と7日の列を並べ、各日の列は CSS の subgrid で
 * 同じ行（見出しの行と、動画がある時間帯ごとの行）を共有する。同じ時間帯の
 * 動画は日をまたいで横に並ぶ。1024px 未満では日付ごとのセクションを縦に積む。
 */
const DAYS_CLASS_NAME =
  'space-y-8 lg:grid lg:grid-cols-[auto_repeat(7,minmax(0,1fr))] lg:gap-x-2 lg:space-y-0'
const COLUMN_CLASS_NAME =
  'lg:row-span-full lg:grid lg:grid-rows-subgrid lg:content-start'
const SLOT_CLASS_NAME = 'lg:border-t lg:border-border lg:py-2'

/** 見出しの行と、時間帯ごとの行。時間帯がない週も1行は確保する */
function getRowsStyle(slotCount: number): CSSProperties {
  return {
    gridTemplateRows: `auto repeat(${Math.max(slotCount, 1)}, auto)`,
  }
}

function formatHour(hour: number): string {
  return `${hour.toString(10).padStart(2, '0')}:00`
}

interface ScheduleDayProps {
  date: Temporal.PlainDate
  hours: number[]
  items: ScheduleVideo[]
  referenceDate: string
}

function ScheduleDay({ date, hours, items, referenceDate }: ScheduleDayProps) {
  const id = getDayId(date)
  const headingId = `${id}-heading`
  const itemsByHour = Map.groupBy(items, (item) =>
    getStartHour(item.published_at),
  )

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

      {items.length > 0 ? (
        hours.map((hour) => {
          const hourItems = itemsByHour.get(hour) ?? []

          return (
            <ul
              className={twMerge(
                SLOT_CLASS_NAME,
                'mt-2 space-y-2 lg:mt-0',
                // 狭い画面では空の時間帯を出さない
                hourItems.length === 0 && 'max-lg:hidden',
              )}
              data-hour={hour}
              key={hour}
            >
              {hourItems.map((item) => (
                <li key={item.id}>
                  <ScheduleItem value={item} />
                </li>
              ))}
            </ul>
          )
        })
      ) : (
        <p className={twMerge(SLOT_CLASS_NAME, 'mt-2 text-meta text-muted')}>
          配信はありません
        </p>
      )}
    </section>
  )
}

/**
 * 1週間ぶんの配信と動画を、開始日時の日付と時間帯ごとに並べる。動画がない日も
 * 日付は出す。
 */
export async function ScheduleDays({ params }: ScheduleWeekSectionProps) {
  const { today, weekStart } = await resolveScheduleWeek(params)
  // リンク先が作れない動画は表示しないので、件数にも入れない
  const videos = (await fetchScheduleVideos(weekStart.toString())).filter(
    (video) => getScheduleVideoUrl(video) !== null,
  )
  const groups = groupVideosByDate(videos)
  const hours = getStartHours(videos)

  return (
    <div className={DAYS_CLASS_NAME} style={getRowsStyle(hours.length)}>
      {/* 時刻の列。各項目にも開始時刻があるので、読み上げない */}
      <div aria-hidden="true" className={twMerge(COLUMN_CLASS_NAME, 'hidden')}>
        <span />
        {hours.map((hour) => (
          <span
            className={twMerge(
              SLOT_CLASS_NAME,
              'text-meta text-muted tabular-nums',
            )}
            key={hour}
          >
            {formatHour(hour)}
          </span>
        ))}
      </div>

      {getWeekDays(weekStart).map((date) => (
        <ScheduleDay
          date={date}
          hours={hours}
          items={groups.get(date.toString()) ?? []}
          key={date.toString()}
          referenceDate={today.toString()}
        />
      ))}
    </div>
  )
}

export function ScheduleDaysSkeleton() {
  return (
    <div aria-hidden="true" className={DAYS_CLASS_NAME} style={getRowsStyle(2)}>
      <div className={twMerge(COLUMN_CLASS_NAME, 'hidden')}>
        <span />
        <span className={SLOT_CLASS_NAME} />
        <span className={SLOT_CLASS_NAME} />
      </div>

      {Array.from({ length: 7 }, (_, index) => (
        <div className={twMerge(COLUMN_CLASS_NAME, 'min-w-0')} key={index}>
          <div className="border-b border-border pb-1">
            <span className="inline-block h-[1lh] w-20 animate-pulse rounded-control bg-muted text-body" />
          </div>
          <div className={twMerge(SLOT_CLASS_NAME, 'mt-2 lg:mt-0')}>
            <ScheduleItemSkeleton />
          </div>
          <div className={twMerge(SLOT_CLASS_NAME, 'mt-2 lg:mt-0')}>
            <ScheduleItemSkeleton />
          </div>
        </div>
      ))}
    </div>
  )
}
