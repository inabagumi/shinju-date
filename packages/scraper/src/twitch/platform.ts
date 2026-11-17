import type { PlatformAdapter } from '../internal/platform.js'
import type { TwitchFetcher } from './fetcher.js'
import {
  SAVED_TWITCH_VIDEO_COLUMNS,
  type SavedTwitchVideo,
} from './saved-video.js'
import type { TwitchVideo } from './types.js'
import { toVideoFields } from './video.js'

export type TwitchPlatformAdapter = PlatformAdapter<
  TwitchVideo,
  SavedTwitchVideo
>

/**
 * Describes Twitch to the operations shared by the platforms, reading the
 * platform through `fetcher`.
 *
 * Only Helix videos are looked up: clips live behind another endpoint and
 * placeholders of broadcasts (`live:{stream_id}`) have no Helix resource, so
 * callers keep those apart.
 */
export function createTwitchPlatform(
  fetcher: TwitchFetcher,
): TwitchPlatformAdapter {
  return {
    getPlatformVideoId: (saved) => saved.twitch_video.twitch_video_id,
    async lookUp(ids) {
      const { missingIds, videos } = await fetcher.getVideos(ids)

      return {
        fetchedById: new Map(videos.map((video) => [video.id, video])),
        missingIds,
      }
    },
    platform: 'twitch',
    savedVideoColumns: SAVED_TWITCH_VIDEO_COLUMNS,
    // Twitch has no kinds; every Twitch video is saved as `standard`.
    toFields: (video) => ({ ...toVideoFields(video), video_kind: 'standard' }),
  }
}
