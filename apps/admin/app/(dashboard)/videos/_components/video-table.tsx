import {
  getVideos,
  type VideoFilters,
  type VideoSortField,
  type VideoSortOrder,
} from '../_lib/get-videos'
import VideoList from './video-list'

type Props = {
  currentPage: number
  perPage: number
  filters: VideoFilters
  sortField: VideoSortField
  sortOrder: VideoSortOrder
  channels: Array<{
    created_at: string
    id: number
    name: string
    slug: string
    updated_at: string
  }>
}

/**
 * VideoTable - Async component that fetches and displays video data
 * This component is wrapped with Suspense in the parent page
 */
export async function VideoTable({
  currentPage,
  perPage,
  filters,
  sortField,
  sortOrder,
  channels,
}: Props) {
  const { videos } = await getVideos(
    currentPage,
    perPage,
    filters,
    sortField,
    sortOrder,
  )

  return <VideoList channels={channels} videos={videos} />
}
