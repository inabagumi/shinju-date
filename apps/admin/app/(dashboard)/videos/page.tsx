import { formatNumber } from "@shinju-date/helpers";
import { PageHeader, Skeleton } from "@shinju-date/ui";
import type { Metadata } from "next";
import { Suspense } from "react";

import { toURLSearchParams } from "@/lib/search-params-href";

import { getTalents } from "../talents/_lib/get-talents";
import Pagination from "./_components/pagination";
import {
  VideoFilters,
  VideoFiltersSkeleton,
} from "./_components/video-filters";
import VideoList, { VideoListSkeleton } from "./_components/video-list";
import { getVideosForPage, VIDEOS_PER_PAGE } from "./_lib/get-videos-for-page";

export const metadata: Metadata = {
  title: "動画管理",
};

const VideoFiltersData = async () => {
  const talents = await getTalents();

  return <VideoFilters talents={talents} />;
};

const VideoTableData = async ({
  searchParams,
}: Pick<PageProps<"/videos">, "searchParams">) => {
  const [{ currentPage, sort, totalPages, videos }, query] = await Promise.all([
    getVideosForPage(searchParams),
    searchParams,
  ]);

  return (
    <>
      <VideoList
        searchParams={toURLSearchParams(query)}
        sort={sort}
        videos={videos}
      />
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </>
  );
};

const VideoCountData = async ({
  searchParams,
}: Pick<PageProps<"/videos">, "searchParams">) => {
  const { total } = await getVideosForPage(searchParams);

  return (
    <span className="tabular-nums">全 {formatNumber(total)} 件の動画</span>
  );
};

export default function VideosPage({ searchParams }: PageProps<"/videos">) {
  return (
    <div>
      <PageHeader
        description={
          <Suspense
            fallback={
              <Skeleton className="inline-block h-4 w-32 align-middle" />
            }
          >
            <VideoCountData searchParams={searchParams} />
          </Suspense>
        }
        title="動画管理"
      />

      {/* Filters with independent Suspense */}
      <Suspense fallback={<VideoFiltersSkeleton />}>
        <VideoFiltersData />
      </Suspense>

      {/* Video table with independent Suspense */}
      <Suspense fallback={<VideoListSkeleton rows={VIDEOS_PER_PAGE} />}>
        <VideoTableData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
