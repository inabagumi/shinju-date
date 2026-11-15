import { TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { getVideoExternalUrl } from '@shinju-date/helpers'
import {
  formatDateTimeWithSeconds,
  formatTime,
} from '@shinju-date/temporal-fns'
import { twMerge } from '@shinju-date/ui'
import type { CSSProperties } from 'react'
import LiveNow from '@/components/live-now'
import PlatformBadge from '@/components/platform-badge'
import { CreatorIcon, getVideoCreator } from '@/components/video-creator'
import type { ScheduleVideo } from '@/lib/fetchers'
import { parseThemeColor } from '@/lib/theme-color'

/** 配信中は `LiveNow` の印で示すので、ここには入れない */
const STATUS_LABELS: Record<
  Exclude<Tables<'videos'>['status'], 'LIVE'>,
  string
> = {
  ENDED: '終了済み',
  PUBLISHED: '公開済み',
  UPCOMING: '予定',
}

/**
 * 1024px 未満では左に開始時刻と状態、右にタイトルとタレントを置く。
 * 1024px 以上（7日を横に並べる列の中）では、すべてを縦に積む。
 */
const ITEM_CLASS_NAME =
  'flex gap-3 border-l-4 py-1 pr-2 pl-3 lg:flex-col lg:gap-1 lg:pl-2'
const ASIDE_CLASS_NAME =
  'flex w-14 shrink-0 flex-col items-start gap-1 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center'

interface ScheduleItemProps {
  value: ScheduleVideo
}

/**
 * スケジュールの1件。開始時刻・状態・タイトル・タレントだけを出し、
 * サムネイルは出さない。リンクの挙動は `VideoCard` と同じにする。
 *
 * 左端の縦線はタレントのテーマカラーにする。任意の色なのでコントラスト比を
 * 保証できないため、文字の色や文字の地には使わない。未設定や `#RRGGBB` でない
 * 値のときは `border-border` の色にする。
 */
export default function ScheduleItem({ value }: ScheduleItemProps) {
  const href = getVideoExternalUrl({
    platform: value.platform,
    status: value.status,
    twitchLoginName: value.twitch_video?.twitch_user?.twitch_login_name,
    twitchVideoId: value.twitch_video?.twitch_video_id,
    twitchVideoType: value.twitch_video?.type,
    youtubeVideoId: value.youtube_video?.youtube_video_id,
  })

  if (!href) {
    return null
  }

  const startAt = Temporal.Instant.from(value.published_at).toZonedDateTimeISO(
    TIME_ZONE,
  )
  const themeColor = parseThemeColor(value.talent.theme_color)
  const profileImage = getVideoCreator(value)?.profileImage ?? null
  const style = themeColor
    ? ({ '--talent-color': themeColor } as CSSProperties)
    : undefined

  return (
    <a
      className={twMerge(
        ITEM_CLASS_NAME,
        'group rounded-r-control hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        themeColor ? 'border-l-(--talent-color)' : 'border-l-border',
      )}
      data-testid="schedule-item"
      href={href}
      ping="/api/ping"
      rel="noopener noreferrer"
      style={style}
      target="_blank"
    >
      <span className={ASIDE_CLASS_NAME}>
        {/*
         * サーバーで描画する部品なので、クライアントの部品の `FormattedTime` に
         * Temporal のオブジェクトは渡せない。文字列を組み立てて出す
         */}
        <time
          className="text-meta font-bold text-foreground tabular-nums"
          dateTime={startAt.toString({ timeZoneName: 'never' })}
          title={formatDateTimeWithSeconds(startAt)}
        >
          {formatTime(startAt)}
        </time>

        {value.status === 'LIVE' ? (
          <LiveNow
            className="rounded-control bg-live px-1.5 py-0.5 text-caption font-semibold text-live-foreground"
            status={value.status}
          />
        ) : (
          <span className="text-caption text-muted">
            {STATUS_LABELS[value.status]}
          </span>
        )}

        <PlatformBadge platform={value.platform} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="line-clamp-2 text-meta leading-normal font-semibold wrap-anywhere text-foreground group-hover:underline lg:line-clamp-3"
          title={value.title}
        >
          {value.title}
        </span>

        <span className="flex min-w-0 items-center gap-1.5 text-meta text-muted">
          <CreatorIcon profileImage={profileImage} />
          <span className="min-w-0 truncate" title={value.talent.name}>
            {value.talent.name}
          </span>
        </span>
      </span>
    </a>
  )
}

export function ScheduleItemSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={twMerge(ITEM_CLASS_NAME, 'border-l-border')}
      data-testid="schedule-item-skeleton"
    >
      <span className={ASIDE_CLASS_NAME}>
        <span className="h-4 w-10 animate-pulse rounded-control bg-muted" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="h-4 w-full animate-pulse rounded-control bg-muted" />
        <span className="h-4 w-2/3 animate-pulse rounded-control bg-muted" />
      </span>
    </div>
  )
}
