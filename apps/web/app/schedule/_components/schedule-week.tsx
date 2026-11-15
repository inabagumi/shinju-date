import { twMerge } from '@shinju-date/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { fetchScheduleVideos, type ScheduleVideo } from '@/lib/fetchers'
import { groupVideosByDate } from '@/lib/group-videos-by-date'
import {
  formatWeekRange,
  getSchedulePath,
  getWeekDays,
  SCHEDULE_PATH,
} from '@/lib/schedule'
import {
  resolveScheduleWeek,
  type SchedulePageParams,
} from '../_lib/resolve-schedule-week'
import ScheduleDayHeader from './schedule-day-header'
import ScheduleItem, { ScheduleItemSkeleton } from './schedule-item'

export interface ScheduleWeekSectionProps {
  /** `/schedule` では渡さず、今日を含む週を表示する */
  params?: SchedulePageParams | undefined
}

/**
 * 1024px 以上では7日を横に並べ、それより狭い画面では日付ごとに縦に積む。
 * 640px で7列にすると1列が約80px になり、タレント名が1文字しか入らない
 */
const DAYS_CLASS_NAME = 'grid gap-8 lg:grid-cols-7 lg:gap-2'

const WEEK_LINK_CLASS_NAME =
  'inline-flex items-center gap-0.5 rounded-control font-semibold'

export async function ScheduleWeekTitle({ params }: ScheduleWeekSectionProps) {
  const weekStart = await resolveScheduleWeek(params)

  return (
    <h2 className="text-heading font-bold tabular-nums">
      <time dateTime={weekStart.toString()}>{formatWeekRange(weekStart)}</time>
    </h2>
  )
}

export function ScheduleWeekTitleSkeleton() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-[1lh] w-64 max-w-full animate-pulse rounded-control bg-muted text-heading"
    />
  )
}

type WeekDirection = 'next' | 'previous'

const WEEK_LINK_LABELS: Record<WeekDirection, string> = {
  next: '次の週',
  previous: '前の週',
}

function WeekLinkContent({ direction }: { direction: WeekDirection }) {
  return direction === 'previous' ? (
    <>
      <ChevronLeft aria-hidden="true" className="size-4" />
      {WEEK_LINK_LABELS.previous}
    </>
  ) : (
    <>
      {WEEK_LINK_LABELS.next}
      <ChevronRight aria-hidden="true" className="size-4" />
    </>
  )
}

const ACTIVE_WEEK_LINK_CLASS_NAME = twMerge(
  WEEK_LINK_CLASS_NAME,
  'text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
)

interface AdjacentWeekLinkProps extends ScheduleWeekSectionProps {
  direction: WeekDirection
}

/** 前の週・次の週へのリンク。リンク先は常に月曜の URL にする */
export async function AdjacentWeekLink({
  direction,
  params,
}: AdjacentWeekLinkProps) {
  const weekStart = await resolveScheduleWeek(params)
  const target = weekStart.add({ weeks: direction === 'previous' ? -1 : 1 })

  return (
    <Link
      className={ACTIVE_WEEK_LINK_CLASS_NAME}
      href={getSchedulePath(target)}
    >
      <WeekLinkContent direction={direction} />
    </Link>
  )
}

/** 読み込み中は同じ文言を薄く出し、リンクに置き換わってもずれないようにする */
export function AdjacentWeekLinkSkeleton({
  direction,
}: {
  direction: WeekDirection
}) {
  return (
    <span
      aria-hidden="true"
      className={twMerge(WEEK_LINK_CLASS_NAME, 'text-muted')}
    >
      <WeekLinkContent direction={direction} />
    </span>
  )
}

export function CurrentWeekLink() {
  return (
    <Link className={ACTIVE_WEEK_LINK_CLASS_NAME} href={SCHEDULE_PATH}>
      今週
    </Link>
  )
}

interface ScheduleDayProps {
  date: Temporal.PlainDate
  items: ScheduleVideo[]
}

function ScheduleDay({ date, items }: ScheduleDayProps) {
  const headingId = `schedule-day-${date.toString()}`

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0"
      data-testid="schedule-day"
    >
      <ScheduleDayHeader
        count={items.length}
        date={date.toString()}
        headingId={headingId}
      />

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <ScheduleItem value={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-meta text-muted">配信なし</p>
      )}
    </section>
  )
}

/**
 * 1週間ぶんの配信と動画を、開始日時の日付ごとに並べる。動画がない日も日付は出す。
 */
export async function ScheduleDays({ params }: ScheduleWeekSectionProps) {
  const weekStart = await resolveScheduleWeek(params)
  const videos = await fetchScheduleVideos(weekStart.toString())
  const groups = groupVideosByDate(videos)

  return (
    <div className={DAYS_CLASS_NAME}>
      {getWeekDays(weekStart).map((date) => (
        <ScheduleDay
          date={date}
          items={groups.get(date.toString()) ?? []}
          key={date.toString()}
        />
      ))}
    </div>
  )
}

export function ScheduleDaysSkeleton() {
  return (
    <div aria-hidden="true" className={DAYS_CLASS_NAME}>
      {Array.from({ length: 7 }, (_, index) => (
        <div className="min-w-0" key={index}>
          <div className="mb-3 border-b-2 border-border pb-1">
            <span className="inline-block h-[1lh] w-16 animate-pulse rounded-control bg-muted text-body" />
          </div>

          <div className="space-y-2">
            <ScheduleItemSkeleton />
            <ScheduleItemSkeleton />
          </div>
        </div>
      ))}
    </div>
  )
}
