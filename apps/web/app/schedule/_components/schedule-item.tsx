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

const ITEM_CLASS_NAME = 'block rounded-control border-l-4 py-1.5 pr-1 pl-2'

interface ScheduleItemProps {
  /**
   * 重なる項目が多く、1024px 以上で幅が狭いときにアイコンだけを出す。
   * マウスを乗せるかフォーカスして広げると、すべてを出す。
   * 1024px 未満では通常の項目と同じ表示にする
   */
  compact?: boolean
  value: ScheduleVideo
}

/** アイコンだけの項目の `aria-label`。画面に出ない情報をすべて入れる */
function getCompactLabel(value: ScheduleVideo, time: string): string {
  return [
    time,
    value.status === 'LIVE' ? '配信中' : null,
    value.platform === 'twitch' ? 'Twitch' : null,
    value.talent.name,
    value.title,
  ]
    .filter((part) => part !== null)
    .join(' ')
}

/**
 * スケジュールの1件。開始時刻・タレント・タイトルだけを出し、サムネイルは
 * 出さない。リンクの挙動は `VideoCard` と同じにする。
 *
 * 1024px 以上では、置く側（`group/item` の要素）が決めた位置と高さに収め、
 * はみ出す文字は切る。マウスを乗せるかフォーカスすると、置く側が項目を日の
 * 列の幅いっぱいに広げ、ここでは切っていた中身をすべて出す。
 *
 * 左端の線はタレントのテーマカラーにする。任意の色なのでコントラスト比を
 * 保証できないため、文字の色や文字の地には使わない。未設定や `#RRGGBB` でない
 * 値のときは `border-border` の色にする。
 */
export default function ScheduleItem({
  compact = false,
  value,
}: ScheduleItemProps) {
  const href = getScheduleVideoUrl(value)

  if (!href) {
    return null
  }

  const startAt = Temporal.Instant.from(value.published_at).toZonedDateTimeISO(
    TIME_ZONE,
  )
  const time = formatTime(startAt)
  const themeColor = parseThemeColor(value.talent.theme_color)
  const style = themeColor
    ? ({ '--talent-color': themeColor } as CSSProperties)
    : undefined

  return (
    <a
      aria-label={compact ? getCompactLabel(value, time) : undefined}
      className={twMerge(
        ITEM_CLASS_NAME,
        'group min-w-0 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:h-full lg:overflow-hidden lg:bg-surface lg:hover:bg-muted',
        // 広げたときは、切っていた中身をすべて出す
        'lg:group-focus-within/item:h-auto lg:group-focus-within/item:min-h-full lg:group-hover/item:h-auto lg:group-hover/item:min-h-full',
        compact &&
          'lg:flex lg:flex-col lg:items-center lg:gap-1 lg:px-0.5 lg:group-focus-within/item:block lg:group-focus-within/item:pr-1 lg:group-focus-within/item:pl-2 lg:group-hover/item:block lg:group-hover/item:pr-1 lg:group-hover/item:pl-2',
        themeColor ? 'border-l-(--talent-color)' : 'border-l-border',
      )}
      data-compact={compact || undefined}
      data-start={time}
      data-testid="schedule-item"
      href={href}
      ping="/api/ping"
      rel="noopener noreferrer"
      style={style}
      target="_blank"
    >
      <span
        className={twMerge(
          'flex flex-wrap items-center gap-1',
          compact &&
            'lg:hidden lg:group-focus-within/item:flex lg:group-hover/item:flex',
        )}
      >
        {/*
         * サーバーで描画する部品なので、クライアントの部品の `FormattedTime` に
         * Temporal のオブジェクトは渡せない。文字列を組み立てて出す
         */}
        <time
          className="text-meta font-bold tabular-nums"
          dateTime={startAt.toString({ timeZoneName: 'never' })}
          title={formatDateTimeWithSeconds(startAt)}
        >
          {time}
        </time>

        <LiveNow
          className="rounded-control bg-live px-1.5 py-0.5 text-caption font-semibold text-live-foreground"
          status={value.status}
        />

        <PlatformBadge platform={value.platform} />
      </span>

      <span
        className={twMerge(
          'mt-0.5 flex min-w-0 items-center gap-1.5',
          compact &&
            'lg:mt-0 lg:group-focus-within/item:mt-0.5 lg:group-hover/item:mt-0.5',
        )}
      >
        <TalentIcon size={20} talent={getVideoAccounts(value)} />
        <span
          className={twMerge(
            'min-w-0 truncate text-caption text-muted',
            compact &&
              'lg:hidden lg:group-focus-within/item:block lg:group-hover/item:block',
          )}
        >
          {value.talent.name}
        </span>
      </span>

      {/* アイコンだけのときも、配信中は色ではなく文字で示す */}
      {compact && (
        <LiveNow
          className="hidden max-w-full rounded-control bg-live px-0.5 text-center text-caption font-semibold wrap-anywhere text-live-foreground lg:block lg:group-focus-within/item:hidden lg:group-hover/item:hidden"
          status={value.status}
        />
      )}

      <span
        className={twMerge(
          'mt-0.5 line-clamp-2 text-meta wrap-anywhere group-hover:underline lg:group-focus-within/item:line-clamp-none lg:group-hover/item:line-clamp-none',
          compact &&
            'lg:hidden lg:group-focus-within/item:block lg:group-hover/item:block',
        )}
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
