import type { NewVideoAdapter } from '../internal/operations/save-video.js'
import type { PlatformAdapter } from '../internal/platform.js'
import type { YouTubeFetcher } from './fetcher.js'
import {
  SAVED_YOUTUBE_VIDEO_COLUMNS,
  type SavedYouTubeVideo,
} from './saved-video.js'
import type { YouTubeVideo } from './types.js'
import { getThumbnailSource, toVideoFields } from './video.js'

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
  const getPlatformVideoId = (saved: SavedYouTubeVideo) =>
    saved.youtube_video.youtube_video_id

  return {
    // Asks for the `id` part only, which keeps full sweeps cheap.
    findMissing: (savedVideos) =>
      fetcher.findMissingVideoIds(savedVideos.map(getPlatformVideoId)),
    getPlatformVideoId,
    async lookUp(savedVideos) {
      const { missingIds, videos } = await fetcher.getVideos(
        savedVideos.map(getPlatformVideoId),
      )

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

/** Describes YouTube to the saving of new videos. */
export const YOUTUBE_NEW_VIDEOS: NewVideoAdapter<YouTubeVideo> = {
  getPlatformVideoId: (video) => video.id,
  getThumbnailSource,
  platformVideoIdKey: 'youtubeVideoId',
  toFields: toVideoFields,
  toPlatformVideo: (video, channel) => ({
    platform: 'youtube',
    values: {
      youtube_channel_id: channel.id,
      youtube_video_id: video.id,
    },
  }),
}
