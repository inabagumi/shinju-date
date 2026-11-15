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
   * 同じ時刻の項目と横に並べる。1024px 以上ではアイコンと左の線だけを出し、
   * 時刻・タレント名・タイトルは、まとめの見出しと `aria-label`・`title` で示す。
   * 1024px 未満では通常の項目と同じ表示にする
   */
  compact?: boolean
  value: ScheduleVideo
}

/** 横に並べた項目の `aria-label` と `title`。画面に出ない情報をすべて入れる */
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
  const compactLabel = compact ? getCompactLabel(value, time) : undefined

  return (
    <a
      aria-label={compactLabel}
      className={twMerge(
        ITEM_CLASS_NAME,
        'group min-w-0 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        compact &&
          'lg:flex lg:flex-col lg:items-center lg:gap-1 lg:px-0.5 lg:pl-0.5',
        themeColor ? 'border-l-(--talent-color)' : 'border-l-border',
      )}
      data-compact={compact || undefined}
      data-testid="schedule-item"
      href={href}
      ping="/api/ping"
      rel="noopener noreferrer"
      style={style}
      target="_blank"
      title={compactLabel}
    >
      <span
        className={twMerge(
          'flex flex-wrap items-center gap-1',
          compact && 'lg:hidden',
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
          compact && 'lg:mt-0',
        )}
      >
        <TalentIcon size={20} talent={getVideoAccounts(value)} />
        <span
          className={twMerge(
            'min-w-0 truncate text-caption text-muted',
            compact && 'lg:hidden',
          )}
          title={value.talent.name}
        >
          {value.talent.name}
        </span>
      </span>

      {/* 横に並べたときも、配信中は色ではなく文字で示す */}
      {compact && (
        <LiveNow
          className="hidden max-w-full rounded-control bg-live px-0.5 text-center text-caption font-semibold wrap-anywhere text-live-foreground lg:block"
          status={value.status}
        />
      )}

      <span
        className={twMerge(
          'mt-0.5 line-clamp-2 text-meta wrap-anywhere group-hover:underline',
          compact && 'lg:hidden',
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
