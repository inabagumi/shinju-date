import { formatNumber } from '@shinju-date/helpers'
import { Suspense } from 'react'
import { TableSkeleton } from '@/components/skeletons'
import getChannels from '../channels/_lib/get-channels'
import Pagination from './_components/pagination'
import { VideoFilters } from './_components/video-filters'
import { VideoTable } from './_components/video-table'
import {
  getVideos,
  type VideoFilters as VideoFiltersType,
  type VideoSortField,
  type VideoSortOrder,
} from './_lib/get-videos'

type Props = {
  searchParams: Promise<{
    channelId?: string
    deleted?: string
    page?: string
    search?: string
    sortField?: string
    sortOrder?: string
    visible?: string
  }>
}

export default async function VideosPage({ searchParams }: Props) {
  const params = await searchParams
  const currentPage = Number(params.page) || 1
  const perPage = 20

  // Build filters
  const filters: VideoFiltersType = {}
  if (params.channelId) {
    filters.channelId = Number(params.channelId)
  }
  if (params.visible !== undefined && params.visible !== '') {
    filters.visible = params.visible === 'true'
  }
  if (params.search) {
    filters.search = params.search
  }
  if (params.deleted === 'true') {
    filters.deleted = true
  } else if (params.deleted === 'false') {
    filters.deleted = false
  }
  // If params.deleted is undefined or empty, don't set filters.deleted (will show all)

  // Get sort parameters
  const sortField = (params.sortField as VideoSortField) || 'updated_at'
  const sortOrder = (params.sortOrder as VideoSortOrder) || 'desc'

  // Fetch channels and total count outside Suspense to avoid layout shift
  const [channels, { total }] = await Promise.all([
    getChannels(),
    getVideos(currentPage, perPage, filters, sortField, sortOrder),
  ])
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="font-bold text-2xl">動画管理</h1>
        <p className="text-gray-600">全 {formatNumber(total)} 件の動画</p>
      </div>

      <VideoFilters channels={channels} />

      <Suspense fallback={<TableSkeleton rows={perPage} />}>
        <VideoTable
          channels={channels}
          currentPage={currentPage}
          filters={filters}
          perPage={perPage}
          sortField={sortField}
          sortOrder={sortOrder}
        />
      </Suspense>
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  )
}
