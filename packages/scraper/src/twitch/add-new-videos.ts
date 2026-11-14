import { toDBString } from '@shinju-date/temporal-fns'
import { countChanges } from '../internal/concurrency.js'
import {
  type ActiveTwitchUser,
  getActiveTwitchUsers,
  updateVideo,
} from '../internal/database/index.js'
import type { CrawlContext, WriteContext } from '../types.js'
import type { TwitchFetcher } from './fetcher.js'
import { createTwitchThumbnail, saveTwitchVideo } from './save-video.js'
import {
  findSavedTwitchVideos,
  isLivePlaceholder,
  type SavedTwitchVideo,
  updateTwitchVideo,
} from './saved-video.js'
import type { TwitchStream, TwitchVideo } from './types.js'
import { toLiveFields, toVideoFields } from './video.js'

/** Videos saved at once; each one downloads and resizes a thumbnail. */
const SAVE_CONCURRENCY = 8

/** What to do with a video Twitch lists for a broadcaster. */
export type NewVideoAction =
  /** Not saved yet: insert it. */
  | { kind: 'insert'; liveStream: TwitchStream | undefined; video: TwitchVideo }
  /** The archive of a broadcast we already track: attach it to that row. */
  | {
      kind: 'link'
      liveStream: TwitchStream | undefined
      saved: SavedTwitchVideo
      video: TwitchVideo
    }

export interface PlanNewVideosOptions {
  /** Streams that are on air right now. */
  liveStreams: readonly TwitchStream[]
  /** Saved rows whose stream ID matches one of `videos`. */
  savedByStreamId: readonly SavedTwitchVideo[]
  /** Saved rows whose platform video ID matches one of `videos`. */
  savedByVideoId: readonly SavedTwitchVideo[]
  videos: readonly TwitchVideo[]
}

/**
 * Decides what to do with each listed video.
 *
 * Twitch creates the archive of a broadcast as soon as it starts, so an
 * archive can show up while its stream is still live. Such an archive must not
 * end the broadcast: `liveStream` is set on the action so the row stays LIVE.
 */
export function planNewVideos({
  liveStreams,
  savedByStreamId,
  savedByVideoId,
  videos,
}: PlanNewVideosOptions): NewVideoAction[] {
  const liveStreamById = new Map(
    liveStreams.map((stream) => [stream.id, stream]),
  )
  const savedVideoIds = new Set(
    savedByVideoId.map((saved) => saved.twitch_video.twitch_video_id),
  )
  const savedByStream = new Map<string, SavedTwitchVideo>()

  for (const saved of savedByStreamId) {
    if (saved.twitch_video.stream_id) {
      savedByStream.set(saved.twitch_video.stream_id, saved)
    }
  }

  const actions: NewVideoAction[] = []
  const plannedVideoIds = new Set<string>()

  for (const video of videos) {
    if (savedVideoIds.has(video.id) || plannedVideoIds.has(video.id)) {
      continue
    }

    plannedVideoIds.add(video.id)

    const liveStream =
      video.type === 'archive' && video.stream_id
        ? liveStreamById.get(video.stream_id)
        : undefined
    const saved = video.stream_id
      ? savedByStream.get(video.stream_id)
      : undefined

    if (!saved) {
      actions.push({ kind: 'insert', liveStream, video })
      continue
    }

    // The stream ID is unique, so a row that already owns it rules out an
    // insert. Only a placeholder that is still waiting for its archive (and
    // was not deleted meanwhile) takes the video over.
    if (
      video.type === 'archive' &&
      isLivePlaceholder(saved) &&
      !saved.deleted_at
    ) {
      actions.push({ kind: 'link', liveStream, saved, video })
    }
  }

  return actions
}

/**
 * @returns Whether the action changed what the public site shows.
 */
async function applyAction(
  context: WriteContext,
  action: NewVideoAction,
  userByTwitchId: ReadonlyMap<string, ActiveTwitchUser>,
): Promise<boolean> {
  const { now, supabaseClient } = context
  const { liveStream, video } = action

  if (action.kind === 'insert') {
    const user = userByTwitchId.get(video.user_id)

    if (!user) {
      return false
    }

    return saveTwitchVideo(context, {
      // While the broadcast is on air the row describes the stream, exactly
      // like the placeholder the live sync would have created.
      fields: liveStream ? toLiveFields(liveStream) : toVideoFields(video),
      thumbnailUrl: liveStream ? liveStream.thumbnail_url : video.thumbnail_url,
      twitchVideo: {
        stream_id: video.stream_id,
        twitch_video_id: video.id,
        type: video.type,
      },
      user,
    })
  }

  // Link first: should the next step fail, the row keeps its status and the
  // live sync finishes the job on a later run.
  await updateTwitchVideo(supabaseClient, action.saved.twitch_video.id, {
    twitch_video_id: video.id,
    type: video.type,
  })

  if (liveStream) {
    // Still on air: the live sync ends the row once the stream goes offline.
    return false
  }

  const thumbnail = await createTwitchThumbnail(context, {
    thumbnailUrl: video.thumbnail_url,
    twitchVideoId: video.id,
  })

  await updateVideo(supabaseClient, action.saved.id, {
    ...toVideoFields(video),
    updated_at: toDBString(now),
    ...(thumbnail ? { thumbnail_id: thumbnail.id } : {}),
  })

  return true
}

/**
 * Adds videos (archives and uploads) that appeared on the Twitch accounts of
 * active talents, and attaches archives to the broadcasts the live sync
 * already tracks.
 *
 * Existing videos are never refreshed here, and the LIVE lifecycle of
 * broadcasts belongs to the live sync.
 *
 * @returns The number of videos added or attached.
 */
export async function addNewTwitchVideos(
  context: CrawlContext<TwitchFetcher>,
): Promise<number> {
  const { fetcher, logger, reportError, supabaseClient } = context
  const users = await getActiveTwitchUsers(supabaseClient)

  if (users.length === 0) {
    return 0
  }

  const userByTwitchId = new Map(users.map((user) => [user.twitchUserId, user]))
  const twitchUserIds = [...userByTwitchId.keys()]

  const [liveStreams, archives, uploads] = await Promise.all([
    fetcher.getLiveStreams(twitchUserIds),
    fetcher.getRecentVideos(twitchUserIds, { type: 'archive' }),
    fetcher.getRecentVideos(twitchUserIds, { type: 'upload' }),
  ])

  for (const { accountId, error } of [
    ...archives.failures,
    ...uploads.failures,
  ]) {
    reportError(error, { twitchUserId: accountId })
  }

  const videos = [...archives.videos, ...uploads.videos]

  if (videos.length === 0) {
    return 0
  }

  const [savedByVideoId, savedByStreamId] = await Promise.all([
    findSavedTwitchVideos(
      supabaseClient,
      'twitch_video_id',
      videos.map((video) => video.id),
    ),
    findSavedTwitchVideos(
      supabaseClient,
      'stream_id',
      videos.map((video) => video.stream_id).filter((id) => id !== null),
    ),
  ])

  const actions = planNewVideos({
    liveStreams,
    savedByStreamId,
    savedByVideoId,
    videos,
  })

  return countChanges(
    actions,
    SAVE_CONCURRENCY,
    async (action) => {
      if (!(await applyAction(context, action, userByTwitchId))) {
        return false
      }

      logger.info('動画を追加しました', {
        duration: action.video.duration,
        platform: 'twitch',
        title: action.video.title,
        twitchVideoId: action.video.id,
        type: action.video.type,
      })

      return true
    },
    (error, action) => reportError(error, { twitchVideoId: action.video.id }),
  )
}
