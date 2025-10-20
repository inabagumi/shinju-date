import getChannels from '../../channels/_lib/get-channels'
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
}: Props) {
  const { videos } = await getVideos(
    currentPage,
    perPage,
    filters,
    sortField,
    sortOrder,
  )
  const channels = await getChannels()

  return <VideoList channels={channels} videos={videos} />
}
