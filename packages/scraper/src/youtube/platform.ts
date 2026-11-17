import type { PlatformAdapter } from '../internal/platform.js'
import type { YouTubeFetcher } from './fetcher.js'
import {
  SAVED_YOUTUBE_VIDEO_COLUMNS,
  type SavedYouTubeVideo,
} from './saved-video.js'
import type { YouTubeVideo } from './types.js'
import { toVideoFields } from './video.js'

export type YouTubePlatformAdapter = PlatformAdapter<
  YouTubeVideo,
  SavedYouTubeVideo
>

/**
 * Describes YouTube to the operations shared by the platforms, reading the
 * platform through `fetcher`.
 */
export function createYouTubePlatform(
  fetcher: YouTubeFetcher,
): YouTubePlatformAdapter {
  return {
    getPlatformVideoId: (saved) => saved.youtube_video.youtube_video_id,
    async lookUp(ids) {
      const { missingIds, videos } = await fetcher.getVideos(ids)

      return {
        fetchedById: new Map(videos.map((video) => [video.id, video])),
        missingIds,
      }
    },
    platform: 'youtube',
    savedVideoColumns: SAVED_YOUTUBE_VIDEO_COLUMNS,
    toFields: toVideoFields,
  }
}
