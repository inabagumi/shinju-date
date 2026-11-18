import { TIME_ZONE } from "@shinju-date/constants";
import { formatDuration } from "@shinju-date/temporal-fns";
import { twMerge } from "@shinju-date/ui";
import { ImageIcon } from "lucide-react";
import Image from "next/image";

import type { Video } from "@/lib/data/videos";
import { getVideoCreator } from "@/lib/video-creator";
import { getVideoTitleParts } from "@/lib/video-title";
import { getVideoUrl } from "@/lib/video-url";

import FormattedTime from "./formatted-time";
import LiveBadge from "./live-badge";
import PlatformBadge from "./platform-badge";
import VideoCreator, { VideoCreatorSkeleton } from "./video-creator";

/**
 * - `grid`: サムネイルの下に文字を置く縦型
 * - `row`: 640px 未満ではサムネイルを左（幅 40%）、文字を右に置く横型。
 *   640px 以上では `grid` と同じ縦型
 * - `short`: 9:16 のサムネイルの縦型（ショートのカルーセル用）
 */
export type VideoCardVariant = "grid" | "row" | "short";

const LAYOUT_CLASS_NAMES: Record<VideoCardVariant, string> = {
  grid: "flex-col",
  row: "flex-row sm:flex-col",
  short: "flex-col",
};

const THUMBNAIL_CLASS_NAMES: Record<VideoCardVariant, string> = {
  grid: "aspect-video w-full",
  row: "aspect-video w-2/5 shrink-0 sm:w-full",
  short: "aspect-9/16 w-full",
};

const THUMBNAIL_SIZES: Record<VideoCardVariant, string> = {
  grid: "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  row: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 40vw",
  short: "(min-width: 768px) 25vw, 85vw",
};

const BADGE_CLASS_NAME =
  "inline-block rounded-control px-1.5 py-0.5 text-caption font-semibold";

/**
 * タイトルの上の、ラベルとハッシュタグの行。内容がないカードでも1行ぶんの高さを
 * 確保して、カードの高さを揃える
 */
const TAGS_CLASS_NAME = "truncate min-h-[1lh] text-caption text-muted";

function getThumbnailURL(
  video: Video
): [src: string, blurDataURL: string] | null {
  if (!video.thumbnail) {
    return null;
  }

  return [
    `/images/thumbnails/${video.thumbnail.id}`,
    video.thumbnail.blur_data_url,
  ];
}

interface ThumbnailProps {
  sizes: string;
  video: Video;
}

function Thumbnail({ sizes, video }: ThumbnailProps) {
  const thumbnailData = getThumbnailURL(video);

  if (!thumbnailData) {
    // サムネイルが存在しない場合のプレースホルダー
    return (
      <div className="flex size-full items-center justify-center bg-muted text-muted">
        <ImageIcon className="size-12" strokeWidth={1} />
      </div>
    );
  }

  const [publicURL, blurDataURL] = thumbnailData;

  return (
    <Image
      alt=""
      blurDataURL={blurDataURL ?? ""}
      className="object-cover object-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
      fill
      placeholder={blurDataURL ? "blur" : "empty"}
      sizes={sizes}
      src={publicURL}
    />
  );
}

interface VideoCardSkeletonProps {
  className?: string | undefined;
  variant?: VideoCardVariant;
}

export function VideoCardSkeleton({
  className,
  variant = "grid",
}: VideoCardSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={twMerge("flex gap-3", LAYOUT_CLASS_NAMES[variant], className)}
      data-testid="video-card-skeleton"
    >
      <div
        className={twMerge(
          "animate-pulse rounded-container bg-muted",
          THUMBNAIL_CLASS_NAMES[variant]
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* ラベルとハッシュタグの1行ぶんの高さ */}
        {variant !== "short" && (
          <div className="flex min-h-[1lh] items-center text-caption">
            <span className="h-3 w-1/3 animate-pulse rounded-control bg-muted" />
          </div>
        )}

        {/* タイトルの2行ぶんの高さ */}
        <div className="flex min-h-[2lh] flex-col justify-around text-body leading-normal">
          <span className="h-4 w-full animate-pulse rounded-control bg-muted" />
          <span className="h-4 w-2/3 animate-pulse rounded-control bg-muted" />
        </div>

        <div className="flex min-h-[1lh] items-center gap-1.5 text-meta">
          <VideoCreatorSkeleton />
          <span className="h-3 w-12 animate-pulse rounded-control bg-muted" />
        </div>
      </div>
    </div>
  );
}

interface VideoCardProps {
  className?: string;
  dateTimeFormatOptions?: Pick<
    Intl.DateTimeFormatOptions,
    "dateStyle" | "timeStyle"
  >;
  /** 640px 未満で補助情報の日時を隠す。日時をカードの外に表示する場合に使う */
  hideTimeOnMobile?: boolean;
  /** 配信予定の動画の開始時刻の前に「予定」と表示する */
  showUpcomingLabel?: boolean;
  /** タイトルの見出しの要素。カードを置く場所の見出しの階層に合わせる */
  titleAs?: "h3" | "h4";
  value: Video;
  variant?: VideoCardVariant;
}

export default function VideoCard({
  className,
  dateTimeFormatOptions = {
    dateStyle: undefined,
    timeStyle: "short",
  },
  hideTimeOnMobile = false,
  showUpcomingLabel = false,
  titleAs: Title = "h3",
  value,
  variant = "grid",
}: VideoCardProps) {
  const publishedAt = Temporal.Instant.from(
    value.published_at
  ).toZonedDateTimeISO(TIME_ZONE);
  const duration = Temporal.Duration.from(value.duration);
  const hasCreator = getVideoCreator(value) !== null;
  // 9:16 のサムネイルを使わない表示では、ショートをバッジで見分けられるようにする
  const isShortInWideThumbnail =
    value.video_kind === "short" && variant !== "short";
  const isUpcoming = showUpcomingLabel && value.status === "UPCOMING";
  const { tags, text: titleText } = getVideoTitleParts(
    value.title,
    value.talent.name
  );

  const href = getVideoUrl(value);

  if (!href) {
    return null;
  }

  return (
    <a
      className={twMerge(
        "group flex gap-3 rounded-container focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
        LAYOUT_CLASS_NAMES[variant],
        className
      )}
      data-variant={variant}
      href={href}
      ping="/api/ping"
      rel="noopener noreferrer"
      target="_blank"
    >
      {/* `isolate` keeps the rounded corners while the image is scaled in Safari. */}
      <div
        className={twMerge(
          "relative isolate overflow-hidden rounded-container bg-muted",
          THUMBNAIL_CLASS_NAMES[variant]
        )}
        data-testid="video-card-thumbnail"
      >
        <Thumbnail sizes={THUMBNAIL_SIZES[variant]} video={value} />

        {value.status === "LIVE" && (
          <LiveBadge className="absolute top-0 left-0 m-2" />
        )}

        <PlatformBadge
          className="absolute top-0 right-0 m-2"
          platform={value.platform}
        />

        {/*
         * 「ショート」と再生時間はサムネイルの上に重ねるので、ライト／ダークに
         * かかわらず半透明の黒の地に白の文字で表示する
         */}
        {isShortInWideThumbnail && (
          <span
            className={twMerge(
              BADGE_CLASS_NAME,
              "absolute bottom-0 left-0 m-2 bg-black/70 text-white"
            )}
          >
            ショート
          </span>
        )}

        {duration.total({ unit: "second" }) > 0 && (
          <span
            className={twMerge(
              BADGE_CLASS_NAME,
              "absolute right-0 bottom-0 m-2 bg-black/70 text-white tabular-nums"
            )}
          >
            <time dateTime={duration.toString()}>
              {formatDuration(duration)}
            </time>
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/*
         * ラベルとハッシュタグは、カード全体が1つのリンクなのでリンクにしない。
         * ショートのカルーセルでは出さない
         */}
        {variant !== "short" && (
          <p className={TAGS_CLASS_NAME} data-testid="video-card-tags">
            {tags}
          </p>
        )}

        {/* 1行のタイトルでも2行ぶんの高さを確保して、カードの高さを揃える */}
        <Title
          className="line-clamp-2 min-h-[2lh] text-body leading-normal font-semibold wrap-anywhere group-hover:underline"
          title={value.title}
        >
          {titleText}
        </Title>

        <p className="flex min-w-0 items-center gap-1 text-meta text-muted">
          <VideoCreator value={value} />
          {hasCreator && (
            <span
              aria-hidden="true"
              className={twMerge(
                "shrink-0",
                hideTimeOnMobile && "max-sm:hidden"
              )}
            >
              ・
            </span>
          )}
          {isUpcoming && (
            <span
              className={twMerge(
                "shrink-0",
                hideTimeOnMobile && "max-sm:hidden"
              )}
            >
              予定
            </span>
          )}
          <FormattedTime
            className={twMerge(
              "shrink-0 whitespace-nowrap tabular-nums",
              hideTimeOnMobile && "max-sm:hidden"
            )}
            dateTime={publishedAt}
            options={dateTimeFormatOptions}
          />
        </p>
      </div>
    </a>
  );
}
