import { refreshSavedVideos } from '../internal/operations/refresh-saved-videos.js'
import { sweepUnavailableVideos } from '../internal/operations/sweep-unavailable-videos.js'
import { replaceThumbnail } from '../internal/thumbnails/index.js'
import type { CrawlContext, WriteContext } from '../types.js'
import type { TwitchFetcher } from './fetcher.js'
import {
  createTwitchPlatform,
  getTwitchVideoType,
  type TwitchLookedUpVideo,
} from './platform.js'
import { createTwitchThumbnail } from './save-video.js'
import { type SavedTwitchVideo, updateTwitchVideo } from './saved-video.js'

/**
 * What a refresh does on Twitch only, after the shared columns were written:
 * follows a change of type (e.g. an archive turned into a highlight) and fills
 * in a thumbnail Twitch did not have yet, as Twitch has no thumbnail for a VOD
 * until some time after the broadcast.
 *
 * @returns Whether the saved video changed.
 */
export async function refreshTypeAndThumbnail(
  context: WriteContext,
  saved: SavedTwitchVideo,
  fetched: TwitchLookedUpVideo,
): Promise<boolean> {
  const type = getTwitchVideoType(fetched)
  const typeChanged = saved.twitch_video.type !== type

  if (typeChanged) {
    await updateTwitchVideo(context.supabaseClient, saved.twitch_video.id, {
      type,
    })
  }

  if (saved.thumbnail_id) {
    return typeChanged
  }

  const thumbnail = await replaceThumbnail(context, {
    create: () =>
      createTwitchThumbnail(context, {
        thumbnailUrl: fetched.thumbnail_url,
        twitchVideoId: saved.twitch_video.twitch_video_id,
      }),
    fields: {},
    previousThumbnailId: null,
    videoId: saved.id,
  })

  return thumbnail !== null || typeChanged
}

/**
 * Brings the newest finished Twitch videos of active talents in line with
 * Twitch: updates what changed (title, duration, type), fills in thumbnails
 * that were not available yet and soft-deletes videos Twitch no longer returns.
 *
 * @returns The number of videos updated or deleted.
 */
export function refreshRecentTwitchVideos(
  context: CrawlContext<TwitchFetcher>,
): Promise<number> {
  return refreshSavedVideos(context, createTwitchPlatform(context.fetcher), {
    afterRefresh: (saved, fetched) =>
      refreshTypeAndThumbnail(context, saved, fetched),
    scope: 'recent',
  })
}

/**
 * Checks every saved Twitch video of non-deleted talents (retired ones too)
 * and soft-deletes those Twitch no longer returns. Details are not refreshed.
 *
 * @returns The number of videos deleted.
 */
export function removeUnavailableTwitchVideos(
  context: CrawlContext<TwitchFetcher>,
): Promise<number> {
  return sweepUnavailableVideos(context, createTwitchPlatform(context.fetcher))
}
