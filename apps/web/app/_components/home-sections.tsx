"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import {
  NavigationLink,
  NavigationLinkIcon,
} from "@/components/navigation-link";
import VideoCardList, {
  VideoCardListSkeleton,
} from "@/components/video-card-list";
import { fetchDashboardVideos, fetchUpcomingVideos } from "@/lib/data/videos";
import type { UpcomingVideos, Video } from "@/lib/data/videos";
import { queryKeys } from "@/lib/query-keys";
import { getSchedulePath } from "@/lib/schedule";

import HomeSection, {
  HomeSectionCount,
  HomeSectionCountSkeleton,
} from "./home-section";
import ShortsCarousel, { ShortsCarouselSkeleton } from "./shorts-carousel";
import Timeline, { TimelineSkeleton } from "./timeline";

/** 新着動画は1段ぶん（PC 4列・タブレット 2列×2段・モバイル 4件）だけ表示する */
const RECENT_VIDEOS_LIMIT = 4;

const DATE_TIME_FORMAT_OPTIONS = {
  dateStyle: "short",
  timeStyle: "short",
} as const;

const REFETCH_INTERVAL = 60_000;

export interface DashboardVideos {
  live: Video[];
  recent: Video[];
  shorts: Video[];
}

/**
 * 配信中・新着動画・ショートは1つの問い合わせにまとめ、
 * 3つのセクションで同じキャッシュを共有する。
 */
function useDashboardVideos(prefetchedData: DashboardVideos): DashboardVideos {
  const { data = prefetchedData } = useQuery({
    initialData: prefetchedData,
    queryFn: () => fetchDashboardVideos(),
    queryKey: queryKeys.dashboardVideos(),
    refetchInterval: REFETCH_INTERVAL,
  });

  return data;
}

interface DashboardSectionProps {
  prefetchedData: DashboardVideos;
}

function LiveTitle() {
  return (
    <>
      <span aria-hidden="true" className="size-2.5 rounded-full bg-live" />
      配信中
    </>
  );
}

/**
 * 配信中の動画。1件もないときはセクションごと表示しない。
 */
export function LiveSection({ prefetchedData }: DashboardSectionProps) {
  const { live } = useDashboardVideos(prefetchedData);

  if (live.length === 0) {
    return null;
  }

  return (
    <HomeSection
      aside={<HomeSectionCount count={live.length} />}
      title={<LiveTitle />}
    >
      <VideoCardList
        className="lg:grid-cols-4"
        dateTimeFormatOptions={DATE_TIME_FORMAT_OPTIONS}
        values={live}
        variant="grid"
      />
    </HomeSection>
  );
}

/** タイムラインの下に置く、週ごとのスケジュールへのリンク */
function ScheduleLink() {
  return (
    <p className="mt-6 text-meta">
      <NavigationLink href={getSchedulePath()}>
        スケジュールを見る
        <NavigationLinkIcon>
          <ChevronRight />
        </NavigationLinkIcon>
      </NavigationLink>
    </p>
  );
}

interface ScheduleSectionProps {
  prefetchedData: UpcomingVideos;
}

/**
 * このあとの配信予定。日付ごとのタイムラインで表示する。
 */
export function ScheduleSection({ prefetchedData }: ScheduleSectionProps) {
  const { data: { today, videos } = prefetchedData } = useQuery({
    initialData: prefetchedData,
    queryFn: () => fetchUpcomingVideos(),
    queryKey: queryKeys.upcomingVideos(),
    refetchInterval: REFETCH_INTERVAL,
  });

  return (
    <HomeSection
      aside={<HomeSectionCount count={videos.length} />}
      title="配信予定"
    >
      {videos.length > 0 ? (
        <Timeline referenceDate={today} videos={videos} />
      ) : (
        <p className="text-body text-muted">
          現在、予定されている配信はありません
        </p>
      )}

      <ScheduleLink />
    </HomeSection>
  );
}

export function ScheduleSectionSkeleton() {
  return (
    <HomeSection aside={<HomeSectionCountSkeleton />} title="配信予定">
      <TimelineSkeleton />
      <ScheduleLink />
    </HomeSection>
  );
}

function VideosLink() {
  return (
    <NavigationLink href="/videos">
      動画一覧を見る
      <NavigationLinkIcon>
        <ChevronRight />
      </NavigationLinkIcon>
    </NavigationLink>
  );
}

/**
 * 直近の動画を1段ぶん表示し、続きは動画一覧へ案内する。
 */
export function RecentSection({ prefetchedData }: DashboardSectionProps) {
  const { recent } = useDashboardVideos(prefetchedData);
  const values = recent.slice(0, RECENT_VIDEOS_LIMIT);

  return (
    <HomeSection aside={<VideosLink />} title="新着動画">
      {values.length > 0 ? (
        <VideoCardList
          className="lg:grid-cols-4"
          dateTimeFormatOptions={DATE_TIME_FORMAT_OPTIONS}
          values={values}
          variant="row"
        />
      ) : (
        <p className="text-body text-muted">新着動画はありません</p>
      )}
    </HomeSection>
  );
}

export function RecentSectionSkeleton() {
  return (
    <HomeSection aside={<VideosLink />} title="新着動画">
      <VideoCardListSkeleton
        className="lg:grid-cols-4"
        count={RECENT_VIDEOS_LIMIT}
        variant="row"
      />
    </HomeSection>
  );
}

/**
 * ショートのカルーセル。1件もないときはセクションごと表示しない。
 */
export function ShortsSection({ prefetchedData }: DashboardSectionProps) {
  const { shorts } = useDashboardVideos(prefetchedData);

  if (shorts.length === 0) {
    return null;
  }

  return (
    <HomeSection
      aside={<HomeSectionCount count={shorts.length} />}
      title="ショート"
    >
      <ShortsCarousel videos={shorts} />
    </HomeSection>
  );
}

export function ShortsSectionSkeleton() {
  return (
    <HomeSection aside={<HomeSectionCountSkeleton />} title="ショート">
      <ShortsCarouselSkeleton />
    </HomeSection>
  );
}
