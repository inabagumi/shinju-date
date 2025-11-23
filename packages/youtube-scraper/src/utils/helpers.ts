import type { youtube_v3 as youtube } from '@googleapis/youtube'
import type {
  YouTubeChannel,
  YouTubePlaylistItem,
  YouTubeVideo,
} from '../types/index.js'

export const YOUTUBE_DATA_API_MAX_RESULTS = 50

export function isValidChannel(
  item: youtube.Schema$Channel,
): item is YouTubeChannel {
  return (
    typeof item.id === 'string' &&
    typeof item.contentDetails?.relatedPlaylists?.uploads === 'string' &&
    typeof item.snippet?.title === 'string'
  )
}

export function isValidPlaylistItem(
  item: youtube.Schema$PlaylistItem,
): item is YouTubePlaylistItem {
  return typeof item.contentDetails?.videoId === 'string'
}

export function isValidVideo(item: youtube.Schema$Video): item is YouTubeVideo {
  return (
    typeof item.id === 'string' &&
    typeof item.snippet?.publishedAt === 'string' &&
    'contentDetails' in item
  )
}
