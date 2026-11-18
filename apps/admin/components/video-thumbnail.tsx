import { twMerge } from "@shinju-date/ui";
import Image from "next/image";

export type VideoThumbnailSize = "sm" | "md" | "lg";

interface Thumbnail {
  blur_data_url: string;
  id: string;
}

interface VideoThumbnailProps {
  /** 画像の代替テキスト。隣にタイトルがあるときは空のままにする */
  alt?: string | undefined;
  className?: string | undefined;
  size: VideoThumbnailSize;
  thumbnail: Thumbnail | null | undefined;
}

const sizeClassNames: Record<VideoThumbnailSize, string> = {
  lg: "w-full",
  md: "w-28 shrink-0",
  sm: "w-20 shrink-0",
};

const imageSizes: Record<VideoThumbnailSize, string> = {
  lg: "(max-width: 1024px) 100vw, 50vw",
  md: "112px",
  sm: "80px",
};

/**
 * 動画のサムネイル。画像がない動画は、同じ大きさの枠に「No Image」を描く。
 */
export const VideoThumbnail = ({
  alt = "",
  className,
  size,
  thumbnail,
}: VideoThumbnailProps) => {
  const frameClassName = twMerge(
    "relative aspect-video",
    sizeClassNames[size],
    className
  );

  if (!thumbnail) {
    return (
      <div
        className={twMerge(
          frameClassName,
          "flex items-center justify-center rounded-container bg-muted text-muted",
          size === "lg" ? "text-meta" : "text-caption"
        )}
      >
        No Image
      </div>
    );
  }

  return (
    <div className={frameClassName}>
      <Image
        alt={alt}
        blurDataURL={thumbnail.blur_data_url}
        className="rounded-container object-cover"
        fill
        placeholder="blur"
        sizes={imageSizes[size]}
        src={`/images/thumbnails/${thumbnail.id}`}
      />
    </div>
  );
};
