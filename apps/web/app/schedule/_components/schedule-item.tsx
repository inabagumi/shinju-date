import { TIME_ZONE } from "@shinju-date/constants";
import {
  formatDate,
  formatDateTimeWithSeconds,
  formatTime,
} from "@shinju-date/temporal-fns";
import { twMerge } from "@shinju-date/ui";
import type { CSSProperties } from "react";

import LiveBadge from "@/components/live-badge";
import PlatformBadge from "@/components/platform-badge";
import TalentIcon from "@/components/talent-icon";
import type { ScheduleVideo } from "@/lib/data/schedule";
import { parseThemeColor } from "@/lib/theme-color";
import { getVideoTitleParts } from "@/lib/video-title";
import { getVideoUrl } from "@/lib/video-url";

import {
  HOUR_HEIGHT_REM,
  ITEM_CHROME_HEIGHT,
  ROOT_FONT_SIZE,
  TITLE_LINE_HEIGHT,
} from "../_lib/layout";

/**
 * `TalentIcon` に渡すアカウント。動画の YouTube チャンネルか Twitch ユーザーの
 * アイコンを使う。
 */
const getVideoAccounts = (video: ScheduleVideo) => {
  const youtubeChannel = video.youtube_video?.youtube_channel;
  const twitchUser = video.twitch_video?.twitch_user;

  return {
    twitch_users: twitchUser
      ? [{ profile_image: twitchUser.profile_image }]
      : [],
    youtube_channels: youtubeChannel
      ? [{ profile_image: youtubeChannel.profile_image }]
      : [],
  };
};

/**
 * 地と見分けられるよう枠を付ける。左の線だけはタレントのテーマカラーにする。
 * 広げたときに下の項目が透けないよう、地は不透明な `bg-surface` にする
 * （ライトでは地と同じ白なので、見た目は枠だけになる）
 */
const ITEM_CLASS_NAME =
  "block rounded-control border border-l-4 border-border bg-surface py-1 pr-1 pl-2";

/**
 * 1024px 以上で、長さ（分）ぶんの高さの項目に入るタイトルの行数。行の途中で
 * 切れないよう、入りきる行数だけ出す。0 のときはタイトルを出さない
 */
export const getTitleLines = (lengthMinutes: number): number => {
  const hourHeight = HOUR_HEIGHT_REM * ROOT_FONT_SIZE;
  const height = (hourHeight * lengthMinutes) / 60;

  return Math.max(
    0,
    Math.floor((height - ITEM_CHROME_HEIGHT) / TITLE_LINE_HEIGHT)
  );
};

interface ScheduleItemProps {
  /**
   * 前の日から続く配信の、0:00 からの部分か。開始時刻に日付を付け、続きで
   * あることがわかるようにする
   */
  continued?: boolean | undefined;
  /** 次の日の列に続く部分か（1024px 以上で、下の角を丸めない） */
  continues?: boolean | undefined;
  /**
   * 1024px 以上でタイトルを出す行数（`getTitleLines`）。省略すると2行まで。
   * 広げたときは行数にかかわらず全文を出す
   */
  titleLines?: number | undefined;
  value: ScheduleVideo;
}

/**
 * スケジュールの1件。アイコン・開始時刻・タレント名を1行目に、タイトルをその
 * 下に出し、サムネイルは出さない。1行目とタイトルの間には、動画カードと同じ
 * ラベルとハッシュタグの行を出す（1024px 以上では広げたときだけ）。リンクの挙動は `VideoCard` と同じにする。
 *
 * 1024px 以上では、置く側（`group/item` の要素）が決めた位置と大きさに収め、
 * 入りきらない部分は切る。幅が狭くても並びは変えず、先頭のアイコンで誰の配信か
 * わかるようにする。マウスを乗せるかフォーカスして置く側が広げたとき、アイコンや
 * 文字の位置はずれない。広げたときは、浮いて見えるよう影を付けて、タイトルを
 * 全文出す。
 *
 * 0時をまたぐ配信は、開始日と次の日の列に分けて置く（`layoutDay`）。次の日の
 * 部分（`continued`）は、開始時刻に日付を付けて「11/09 23:00〜」と出す。
 * 1024px 以上では、分けた部分の境目の角を丸めず、続いていることを示す。
 *
 * 左端の線はタレントのテーマカラーにする。任意の色なのでコントラスト比を
 * 保証できないため、文字の色や文字の地には使わない。未設定や `#RRGGBB` でない
 * 値のときは `border-border` の色にする。
 */
export default function ScheduleItem({
  continued = false,
  continues = false,
  titleLines,
  value,
}: ScheduleItemProps) {
  const href = getVideoUrl(value);

  if (!href) {
    return null;
  }

  const startAt = Temporal.Instant.from(value.published_at).toZonedDateTimeISO(
    TIME_ZONE
  );
  const themeColor = parseThemeColor(value.talent.theme_color);
  const style = themeColor
    ? ({ "--talent-color": themeColor } as CSSProperties)
    : undefined;
  // 動画カードと同じく、【】と末尾のハッシュタグを除いた本文をタイトルに出し、
  // 先頭のラベルとハッシュタグは1行目とタイトルの間の行に出す
  const { tags, text: titleText } = getVideoTitleParts(
    value.title,
    value.talent.name
  );

  return (
    <a
      className={twMerge(
        ITEM_CLASS_NAME,
        "group min-w-0 focus-ring lg:min-h-0 lg:flex-1 lg:overflow-hidden",
        // 広げたときは、浮いて見えるよう影を付ける（地の色は変えない）。影は
        // 項目そのものに付け、項目と影の大きさをそろえる
        "lg:group-focus-within/item:shadow-overlay lg:group-hover/item:shadow-overlay",
        themeColor ? "border-l-(--talent-color)" : "border-l-border",
        // 日をまたいで分けた部分の境目
        continued && "lg:rounded-t-none",
        continues && "lg:rounded-b-none"
      )}
      data-continued={continued || undefined}
      // その日の列で置く位置の時刻。前の日から続く部分は 0:00 から置く
      data-start={continued ? "00:00" : formatTime(startAt)}
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
          dateTime={startAt.toString({ timeZoneName: "never" })}
          title={formatDateTimeWithSeconds(startAt)}
        >
          {continued
            ? `${formatDate(startAt, { includeYear: false })} ${formatTime(startAt)}`
            : formatTime(startAt)}
        </time>

        {/* 前の日の開始時刻から続いていることを示す */}
        {continued && (
          <span className="-ml-1.5 shrink-0 text-meta leading-5 font-bold">
            〜
          </span>
        )}

        {value.status === "LIVE" && (
          <LiveBadge className="shrink-0" size="compact" />
        )}

        <PlatformBadge
          className="shrink-0 leading-4"
          platform={value.platform}
        />

        <span className="min-w-0 truncate text-caption text-muted">
          {value.talent.name}
        </span>
      </span>

      {/*
       * ラベルとハッシュタグの行。項目全体が1つのリンクなのでリンクにしない。
       * 1024px 以上で広げていないときは、タイトルの行数（`getTitleLines`）を
       * 減らさないよう出さない。広げたときは高さが中身に合わせて伸びるので出す
       */}
      {tags && (
        <span
          className="mt-0.5 block truncate text-caption text-muted lg:hidden lg:group-focus-within/item:block lg:group-hover/item:block"
          data-testid="schedule-item-tags"
        >
          {tags}
        </span>
      )}

      <span
        className={twMerge(
          "mt-0.5 line-clamp-2 text-meta wrap-anywhere group-hover:underline",
          titleLines !== undefined &&
            (titleLines > 0 ? "lg:line-clamp-(--title-lines)" : "lg:hidden"),
          // 広げたときは全文を出す
          // (`line-clamp-none` は `display: block` も指定する)
          "lg:group-focus-within/item:line-clamp-none lg:group-hover/item:line-clamp-none"
        )}
        style={
          titleLines
            ? ({ "--title-lines": titleLines } as CSSProperties)
            : undefined
        }
        title={value.title}
      >
        {titleText}
      </span>
    </a>
  );
}

export const ScheduleItemSkeleton = () => (
  <div
    aria-hidden="true"
    className={twMerge(ITEM_CLASS_NAME, "space-y-1.5 border-l-border")}
    data-testid="schedule-item-skeleton"
  >
    <span className="block h-4 w-10 animate-pulse rounded-control bg-muted" />
    <span className="block h-3 w-20 animate-pulse rounded-control bg-muted" />
    <span className="block h-4 w-full animate-pulse rounded-control bg-muted" />
  </div>
);
