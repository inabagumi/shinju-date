import type { PlatformAdapter } from '../internal/platform.js'
import type { TwitchFetcher } from './fetcher.js'
import {
  isLivePlaceholder,
  SAVED_TWITCH_VIDEO_COLUMNS,
  type SavedTwitchVideo,
} from './saved-video.js'
import type { TwitchClip, TwitchVideo } from './types.js'
import { type TwitchVideoType, toClipFields, toVideoFields } from './video.js'

/** What Twitch returns for a saved video: a Helix video, or a clip. */
export type TwitchLookedUpVideo = TwitchClip | TwitchVideo

export type TwitchPlatformAdapter = PlatformAdapter<
  TwitchLookedUpVideo,
  SavedTwitchVideo
>

/** Whether Twitch returned a clip rather than a Helix video. */
export function isTwitchClip(video: TwitchLookedUpVideo): video is TwitchClip {
  return !('type' in video)
}

/** The `twitch_videos.type` of what Twitch returned. */
export function getTwitchVideoType(
  video: TwitchLookedUpVideo,
): TwitchVideoType {
  return isTwitchClip(video) ? 'clip' : video.type
}

/**
 * Describes Twitch to the operations shared by the platforms, reading the
 * platform through `fetcher`.
 *
 * Clips live behind a different Helix endpoint than videos, so they are
 * looked up separately. Placeholders of broadcasts (`live:{stream_id}`) have
 * no Helix resource at all, so they are never looked up and never reported
 * missing.
 */
export function createTwitchPlatform(
  fetcher: TwitchFetcher,
): TwitchPlatformAdapter {
  return {
    getPlatformVideoId: (saved) => saved.twitch_video.twitch_video_id,
    async lookUp(savedVideos) {
      const lookedUp = savedVideos.filter((saved) => !isLivePlaceholder(saved))
      const idsOf = (isClip: boolean) =>
        lookedUp
          .filter((saved) => (saved.twitch_video.type === 'clip') === isClip)
          .map((saved) => saved.twitch_video.twitch_video_id)

      const [videoResult, clipResult] = await Promise.all([
        fetcher.getVideos(idsOf(false)),
        fetcher.getClips(idsOf(true)),
      ])
      const fetched: TwitchLookedUpVideo[] = [
        ...videoResult.videos,
        ...clipResult.clips,
      ]

      return {
        fetchedById: new Map(fetched.map((video) => [video.id, video])),
        missingIds: [...videoResult.missingIds, ...clipResult.missingIds],
      }
    },
    platform: 'twitch',
    savedVideoColumns: SAVED_TWITCH_VIDEO_COLUMNS,
    // Twitch has no kinds; every Twitch video is saved as `standard`.
    toFields: (video) => ({
      ...(isTwitchClip(video) ? toClipFields(video) : toVideoFields(video)),
      video_kind: 'standard',
    }),
  }
}
