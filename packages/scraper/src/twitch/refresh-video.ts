import { DatabaseError } from '../internal/errors.js'
import { compareVideoFields } from '../internal/operations/diff-video-fields.js'
import { refreshSavedVideo } from '../internal/operations/refresh-saved-videos.js'
import type {
  CrawlContext,
  RefreshVideoResult,
  TypedSupabaseClient,
} from '../types.js'
import { refreshTypeAndThumbnail } from './check-videos.js'
import type { TwitchFetcher } from './fetcher.js'
import { createTwitchPlatform } from './platform.js'
import { isLivePlaceholder } from './saved-video.js'
import {
  refreshTwitchBroadcast,
  type SavedLiveVideo,
  selectSavedLiveVideos,
  toSavedLiveVideo,
} from './sync-live.js'

async function findSavedVideo(
  supabaseClient: TypedSupabaseClient,
  videoId: string,
): Promise<SavedLiveVideo | null> {
  const { data, error } = await selectSavedLiveVideos(supabaseClient)
    .eq('id', videoId)
    .eq('platform', 'twitch')
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new DatabaseError('Failed to load a Twitch video', error)
  }

  return data && toSavedLiveVideo(data)
}

/**
 * Brings one saved Twitch video in line with Twitch, the same way the
 * scheduled operations do:
 *
 * - a broadcast (a LIVE row, or a placeholder still waiting for its archive)
 *   follows its stream and is linked to its archive once Twitch lists it
 * - any other video or clip is updated from Helix, or soft-deleted when Twitch
 *   no longer returns it
 *
 * Unlike the scheduled operations, the video is refreshed whatever the status
 * of its talent.
 */
export async function refreshTwitchVideo(
  context: CrawlContext<TwitchFetcher>,
  videoId: string,
): Promise<RefreshVideoResult> {
  const { logger, supabaseClient } = context
  const saved = await findSavedVideo(supabaseClient, videoId)

  if (!saved) {
    return { status: 'not-found' }
  }

  if (saved.status === 'LIVE' || isLivePlaceholder(saved)) {
    await refreshTwitchBroadcast(context, saved)
  } else {
    const result = await refreshSavedVideo(
      context,
      createTwitchPlatform(context.fetcher),
      saved,
      {
        afterRefresh: (current, fetched) =>
          refreshTypeAndThumbnail(context, current, fetched),
      },
    )

    if (result === 'unavailable') {
      return { status: 'unavailable' }
    }

    if (!result?.changed) {
      return { status: 'unchanged', title: saved.title }
    }
  }

  // A broadcast may be written in several steps (its row, its link to the
  // archive, its thumbnail), so compare with what they left behind.
  const current = (await findSavedVideo(supabaseClient, videoId)) ?? saved
  const diff = compareVideoFields(saved, current)
  const changed =
    Object.keys(diff.after).length > 0 ||
    current.thumbnail_id !== saved.thumbnail_id ||
    current.twitch_video.twitch_video_id !==
      saved.twitch_video.twitch_video_id ||
    current.twitch_video.type !== saved.twitch_video.type

  if (!changed) {
    return { status: 'unchanged', title: current.title }
  }

  logger.info('動画を更新しました', {
    platform: 'twitch',
    twitchVideoId: current.twitch_video.twitch_video_id,
    videoId,
  })

  return { ...diff, status: 'updated', title: current.title }
}
