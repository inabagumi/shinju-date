import type { Video } from '../_lib/get-videos'
import VideoList from './video-list'

type Props = {
  videos: Video[]
}

/**
 * VideoTable - Component that displays video data
 * Data is passed from parent to avoid nested data fetching
 */
export function VideoTable({ videos }: Props) {
  return <VideoList videos={videos} />
}
