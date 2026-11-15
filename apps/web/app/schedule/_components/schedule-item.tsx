import { TIME_ZONE } from '@shinju-date/constants'
import { getVideoExternalUrl } from '@shinju-date/helpers'
import {
  formatDateTimeWithSeconds,
  formatTime,
} from '@shinju-date/temporal-fns'
import { twMerge } from '@shinju-date/ui'
import type { CSSProperties } from 'react'
import LiveNow from '@/components/live-now'
import PlatformBadge from '@/components/platform-badge'
import TalentIcon from '@/components/talent-icon'
import type { ScheduleVideo } from '@/lib/fetchers'
import { parseThemeColor } from '@/lib/theme-color'

/**
 * 項目のリンク先。`VideoCard` と同じく `getVideoExternalUrl` で作る。
 * リンク先が作れない動画は表示しないので、件数を数える前にこれで絞り込む。
 */
export function getScheduleVideoUrl(video: ScheduleVideo): string | null {
  return getVideoExternalUrl({
    platform: video.platform,
    status: video.status,
    twitchLoginName: video.twitch_video?.twitch_user?.twitch_login_name,
    twitchVideoId: video.twitch_video?.twitch_video_id,
    twitchVideoType: video.twitch_video?.type,
    youtubeVideoId: video.youtube_video?.youtube_video_id,
  })
}

/**
 * `TalentIcon` に渡すアカウント。動画の YouTube チャンネルか Twitch ユーザーの
 * アイコンを使う。
 */
function getVideoAccounts(video: ScheduleVideo) {
  const youtubeChannel = video.youtube_video?.youtube_channel
  const twitchUser = video.twitch_video?.twitch_user

  return {
    twitch_users: twitchUser
      ? [{ profile_image: twitchUser.profile_image }]
      : [],
    youtube_channels: youtubeChannel
      ? [{ profile_image: youtubeChannel.profile_image }]
      : [],
  }
}

/**
 * 地と見分けられるよう枠を付ける。左の線だけはタレントのテーマカラーにする。
 * 広げたときに下の項目が透けないよう、地は不透明な `bg-surface` にする
 * （ライトでは地と同じ白なので、見た目は枠だけになる）
 */
const ITEM_CLASS_NAME =
  'block rounded-control border border-l-4 border-border bg-surface py-1 pr-1 pl-2'

/** 1時間の高さ（`--hour`、px）。`schedule-week.tsx` の値と合わせる */
const HOUR_HEIGHT = 64

/**
 * タイトルより上の高さ（px）: 上下の余白（8）、上下の枠（2）、項目の間の余白
 * （2）、1行目（20）、タイトルとの間（2）
 */
const ITEM_CHROME_HEIGHT = 34

/** タイトルの1行の高さ（px）。`text-meta` の 14px × 1.6 */
const TITLE_LINE_HEIGHT = 22.4

/**
 * 1024px 以上で、長さ（分）ぶんの高さの項目に入るタイトルの行数。行の途中で
 * 切れないよう、入りきる行数だけ出す。0 のときはタイトルを出さない
 */
export function getTitleLines(lengthMinutes: number): number {
  const height = (HOUR_HEIGHT * lengthMinutes) / 60

  return Math.max(
    0,
    Math.floor((height - ITEM_CHROME_HEIGHT) / TITLE_LINE_HEIGHT),
  )
}

interface ScheduleItemProps {
  /**
   * 1024px 以上でタイトルを出す行数（`getTitleLines`）。省略すると2行まで。
   * 広げたときは行数にかかわらず全文を出す
   */
  titleLines?: number | undefined
  value: ScheduleVideo
}

/**
 * スケジュールの1件。アイコン・開始時刻・タレント名を1行目に、タイトルをその
 * 下に出し、サムネイルは出さない。リンクの挙動は `VideoCard` と同じにする。
 *
 * 1024px 以上では、置く側（`group/item` の要素）が決めた位置と大きさに収め、
 * 入りきらない部分は切る。幅が狭くても並びは変えず、先頭のアイコンで誰の配信か
 * わかるようにする。マウスを乗せるかフォーカスして置く側が広げたとき、アイコンや
 * 文字の位置はずれない。広げたときは、浮いて見えるよう影を付けて、タイトルを
 * 全文出す。
 *
 * 左端の線はタレントのテーマカラーにする。任意の色なのでコントラスト比を
 * 保証できないため、文字の色や文字の地には使わない。未設定や `#RRGGBB` でない
 * 値のときは `border-border` の色にする。
 */
export default function ScheduleItem({ titleLines, value }: ScheduleItemProps) {
  const href = getScheduleVideoUrl(value)

  if (!href) {
    return null
  }

  const startAt = Temporal.Instant.from(value.published_at).toZonedDateTimeISO(
    TIME_ZONE,
  )
  const themeColor = parseThemeColor(value.talent.theme_color)
  const style = themeColor
    ? ({ '--talent-color': themeColor } as CSSProperties)
    : undefined

  return (
    <a
      className={twMerge(
        ITEM_CLASS_NAME,
        'group min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:min-h-0 lg:flex-1 lg:overflow-hidden',
        // 広げたときは、浮いて見えるよう影を付ける（地の色は変えない）。影は
        // 項目そのものに付け、項目と影の大きさをそろえる
        'lg:group-focus-within/item:shadow-overlay lg:group-hover/item:shadow-overlay',
        themeColor ? 'border-l-(--talent-color)' : 'border-l-border',
      )}
      data-start={formatTime(startAt)}
      data-testid="schedule-item"
      href={href}
      ping="/api/ping"
      rel="noopener noreferrer"
      style={style}
      target="_blank"
    >
      {/* 1行目は高さを 20px（アイコンの大きさ）にそろえる */}
      <span className="flex h-5 min-w-0 items-center gap-1.5">
        <TalentIcon size={20} talent={getVideoAccounts(value)} />

        {/*
         * サーバーで描画する部品なので、クライアントの部品の `FormattedTime` に
         * Temporal のオブジェクトは渡せない。文字列を組み立てて出す
         */}
        <time
          className="shrink-0 text-meta leading-5 font-bold tabular-nums"
          dateTime={startAt.toString({ timeZoneName: 'never' })}
          title={formatDateTimeWithSeconds(startAt)}
        >
          {formatTime(startAt)}
        </time>

        <LiveNow
          className="shrink-0 rounded-control bg-live px-1.5 py-0.5 text-caption leading-4 font-semibold text-live-foreground"
          status={value.status}
        />

        <PlatformBadge
          className="shrink-0 leading-4"
          platform={value.platform}
        />

        <span className="min-w-0 truncate text-caption text-muted">
          {value.talent.name}
        </span>
      </span>

      <span
        className={twMerge(
          'mt-0.5 line-clamp-2 text-meta wrap-anywhere group-hover:underline',
          titleLines !== undefined &&
            (titleLines > 0 ? 'lg:line-clamp-(--title-lines)' : 'lg:hidden'),
          // 広げたときは全文を出す
          // (`line-clamp-none` は `display: block` も指定する)
          'lg:group-focus-within/item:line-clamp-none lg:group-hover/item:line-clamp-none',
        )}
        style={
          titleLines
            ? ({ '--title-lines': titleLines } as CSSProperties)
            : undefined
        }
        title={value.title}
      >
        {value.title}
      </span>
    </a>
  )
}

export function ScheduleItemSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={twMerge(ITEM_CLASS_NAME, 'space-y-1.5 border-l-border')}
      data-testid="schedule-item-skeleton"
    >
      <span className="block h-4 w-10 animate-pulse rounded-control bg-muted" />
      <span className="block h-3 w-20 animate-pulse rounded-control bg-muted" />
      <span className="block h-4 w-full animate-pulse rounded-control bg-muted" />
    </div>
  )
}
