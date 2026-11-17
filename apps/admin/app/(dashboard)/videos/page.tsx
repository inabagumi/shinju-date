import { formatNumber } from '@shinju-date/helpers'
import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TableSkeleton } from '@/components/skeletons'
import { getTalents } from '../talents/_lib/get-talents'
import Pagination from './_components/pagination'
import { VideoFilters } from './_components/video-filters'
import VideoList from './_components/video-list'
import { getVideosForPage } from './_lib/get-videos-for-page'

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
              <span
                aria-hidden="true"
                className="inline-block h-4 w-32 animate-pulse rounded-control bg-muted align-middle"
              />
            }
          >
            <VideoCountData searchParams={searchParams} />
          </Suspense>
        }
        title="動画管理"
      />

      {/* Filters with independent Suspense */}
      <Suspense
        fallback={
          <div aria-hidden="true" className="mb-4 animate-pulse space-y-3">
            <div className="h-16 w-full rounded-control bg-muted sm:max-w-md" />
            <div className="hidden gap-3 md:flex">
              <div className="h-16 w-48 rounded-control bg-muted" />
              <div className="h-16 w-48 rounded-control bg-muted" />
              <div className="h-16 w-48 rounded-control bg-muted" />
            </div>
          </div>
        }
      >
        <VideoFiltersData />
      </Suspense>

      {/* Video table with independent Suspense */}
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <VideoTableData searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
