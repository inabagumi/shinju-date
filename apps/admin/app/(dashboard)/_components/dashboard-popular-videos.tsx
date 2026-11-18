import { formatNumber, range } from "@shinju-date/helpers";
import { Button, EmptyState, Skeleton } from "@shinju-date/ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

import {
  ExternalVideoLink,
  getExternalVideoUrl,
} from "@/components/external-video-link";
import { Panel, PanelSkeleton } from "@/components/panel";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { getPopularVideos } from "@/lib/analytics/get-popular-videos";

import { getToday } from "../_lib/get-today";

/** 表示する動画の件数 */
const POPULAR_VIDEOS_LIMIT = 10;

/** 読み込み中の `DashboardPopularVideos`。取得する件数ぶんの行を並べる */
export const DashboardPopularVideosSkeleton = () => (
  <PanelSkeleton title="人気動画ランキング (過去30日間)">
    <div className="divide-y divide-border">
      {range(POPULAR_VIDEOS_LIMIT).map((row) => (
        <div
          className="flex items-center gap-4 py-3"
          key={`popular-video-skeleton-${row}`}
        >
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="aspect-video w-28 shrink-0 rounded-container" />
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="size-7" />
          </div>
        </div>
      ))}
    </div>
  </PanelSkeleton>
);

/**
 * DashboardPopularVideos - Displays popular videos ranking
 * This is an async Server Component that fetches its own data
 */
export const DashboardPopularVideos = async () => {
  const today = Temporal.PlainDate.from(await getToday());
  const startDate = today.subtract({ days: 29 });
  const popularVideos = await getPopularVideos({
    limit: POPULAR_VIDEOS_LIMIT,
    range: { end: today.toString(), start: startDate.toString() },
  });

  return (
    <Panel title="人気動画ランキング (過去30日間)">
      {popularVideos.length > 0 ? (
        <ol className="divide-y divide-border">
          {popularVideos.map((video, index) => (
            <li className="flex items-center gap-4 py-3" key={video.id}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-meta font-semibold text-muted tabular-nums">
                {index + 1}
              </div>
              <VideoThumbnail size="md" thumbnail={video.thumbnail} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body leading-normal font-semibold">
                  {video.title}
                </p>
                <p className="text-meta text-muted tabular-nums">
                  クリック数: {formatNumber(video.clicks)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/videos/${video.id}`}>詳細</Link>
                </Button>
                {getExternalVideoUrl(video) && (
                  <ExternalVideoLink
                    className="flex items-center justify-center rounded-control border border-border bg-surface p-1 text-muted focus-ring transition-colors hover:bg-muted hover:text-foreground"
                    video={video}
                  >
                    <ExternalLink aria-hidden="true" className="size-5" />
                    <span className="sr-only">
                      {video.platform === "twitch"
                        ? "Twitchで視聴"
                        : "YouTubeで視聴"}
                    </span>
                  </ExternalVideoLink>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="データがありません" />
      )}
    </Panel>
  );
};
