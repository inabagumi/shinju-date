import { formatNumber } from '@shinju-date/helpers'
import { PageHeader, Skeleton } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTalents } from '../talents/_lib/get-talents'
import Pagination from './_components/pagination'
import { VideoFilters, VideoFiltersSkeleton } from './_components/video-filters'
import VideoList, { VideoListSkeleton } from './_components/video-list'
import { getVideosForPage, VIDEOS_PER_PAGE } from './_lib/get-videos-for-page'

export const metadata: Metadata = {
  title: '動画管理',
}

async function VideoFiltersData() {
  const talents = await getTalents()

  return <VideoFilters talents={talents} />
}

async function VideoTableData({
  searchParams,
}: Pick<PageProps<'/videos'>, 'searchParams'>) {
  const { currentPage, totalPages, videos } =
    await getVideosForPage(searchParams)

  return (
    <>
      <VideoList videos={videos} />
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </>
  )
}

async function VideoCountData({
  searchParams,
}: Pick<PageProps<'/videos'>, 'searchParams'>) {
  const { total } = await getVideosForPage(searchParams)

  return <span className="tabular-nums">全 {formatNumber(total)} 件の動画</span>
}

export default function VideosPage({ searchParams }: PageProps<'/videos'>) {
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
  )
}
