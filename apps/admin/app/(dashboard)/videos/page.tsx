import { formatNumber } from '@shinju-date/helpers'
import getChannels from '../channels/_lib/get-channels'
import Pagination from './_components/pagination'
import VideoList from './_components/video-list'
import {
  getVideos,
  type VideoFilters,
  type VideoSortField,
  type VideoSortOrder,
} from './_lib/get-videos'

type Props = {
  searchParams: Promise<{
    channelId?: string
    deleted?: string
    page?: string
    search?: string
    slug?: string
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
  const filters: VideoFilters = {}
  if (params.channelId) {
    filters.channelId = Number(params.channelId)
  }
  if (params.visible !== undefined && params.visible !== '') {
    filters.visible = params.visible === 'true'
  }
  if (params.slug) {
    filters.slug = params.slug
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

  const { videos, total } = await getVideos(
    currentPage,
    perPage,
    filters,
    sortField,
    sortOrder,
  )
  const channels = await getChannels()
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="font-bold text-2xl">動画管理</h1>
        <p className="text-gray-600">全 {formatNumber(total)} 件の動画</p>
      </div>

      <VideoList channels={channels} videos={videos} />
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  )
}
