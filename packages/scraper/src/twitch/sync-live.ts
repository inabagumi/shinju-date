import { toLiveTwitchVideoId } from '@shinju-date/constants'
import type { TablesUpdate } from '@shinju-date/database'
import {
  getArchivedStreamId,
  TWITCH_API_MAX_RESULTS,
} from '@shinju-date/twitch-api-client'
import type { QueryData } from '@supabase/supabase-js'
import { countChanges } from '../internal/concurrency.js'
import { WRITE_CONCURRENCY } from '../internal/constants.js'
import {
  getActiveAccounts,
  TWITCH_USERS,
  updateVideo,
} from '../internal/database/index.js'
import { DatabaseError } from '../internal/errors.js'
import { saveVideoWithThumbnail } from '../internal/operations/save-video.js'
import type {
  CrawlContext,
  TypedSupabaseClient,
  WriteContext,
} from '../types.js'
import { applyNewVideoAction, planNewVideos } from './add-new-videos.js'
import { attachArchive } from './attach-archive.js'
import type { TwitchFetcher } from './fetcher.js'
import { TWITCH_NEW_VIDEOS } from './platform.js'
import {
  findSavedTwitchVideos,
  isLivePlaceholder,
  SAVED_LIVE_VIDEO_COLUMNS,
  type SavedTwitchVideo,
} from './saved-video.js'
import type { TwitchStream, TwitchVideo } from './types.js'
import { toLiveFields } from './video.js'

/** A saved LIVE row together with the Helix ID of its broadcaster. */
export interface SavedLiveVideo extends SavedTwitchVideo {
  /** `null` when the Twitch account is no longer registered. */
  twitchUserId: string | null
}

export interface LiveSyncPlan {
  /** Rows whose stream went offline. */
  ended: SavedLiveVideo[]
  /** Rows of streams that are on air but are not shown as such. */
  refreshed: { saved: SavedTwitchVideo; values: TablesUpdate<'videos'> }[]
  /** Streams that just went on air and have no row yet. */
  started: TwitchStream[]
}

export interface PlanLiveSyncOptions {
  /** Helix IDs of the accounts new broadcasts are tracked for. */
  activeTwitchUserIds: ReadonlySet<string>
  /** Streams that are on air right now. */
  liveStreams: readonly TwitchStream[]
  /** Saved rows whose stream ID matches one of `liveStreams`. */
  savedByStreamId: readonly SavedTwitchVideo[]
  /** Saved rows that are currently shown as LIVE. */
  savedLiveVideos: readonly SavedLiveVideo[]
}

/**
 * Compares what is on air on Twitch with the rows shown as LIVE and decides
 * which broadcasts started, which rows need a refresh and which ones ended.
 */
export function planLiveSync({
  activeTwitchUserIds,
  liveStreams,
  savedByStreamId,
  savedLiveVideos,
}: PlanLiveSyncOptions): LiveSyncPlan {
  const savedByStream = new Map<string, SavedTwitchVideo>()

  for (const saved of [...savedLiveVideos, ...savedByStreamId]) {
    if (saved.twitch_video.stream_id) {
      savedByStream.set(saved.twitch_video.stream_id, saved)
    }
  }

  const plan: LiveSyncPlan = { ended: [], refreshed: [], started: [] }
  const liveStreamIds = new Set<string>()

  for (const stream of liveStreams) {
    if (liveStreamIds.has(stream.id)) {
      continue
    }

    liveStreamIds.add(stream.id)

    const saved = savedByStream.get(stream.id)

    if (!saved) {
      if (activeTwitchUserIds.has(stream.user_id)) {
        plan.started.push(stream)
      }
      continue
    }

    // A deleted row stays deleted; the broadcast is not brought back.
    if (saved.deleted_at) {
      continue
    }

    const values: TablesUpdate<'videos'> = {}

    if (saved.status !== 'LIVE') {
      values.status = 'LIVE'
    }

    if (saved.title !== stream.title) {
      values.title = stream.title
    }

    if (Object.keys(values).length > 0) {
      plan.refreshed.push({ saved, values })
    }
  }

  for (const saved of savedLiveVideos) {
    const streamId = saved.twitch_video.stream_id

    if (!streamId || !liveStreamIds.has(streamId)) {
      plan.ended.push(saved)
    }
  }

  return plan
}

/** Selects saved rows together with the Helix ID of their broadcaster. */
export function selectSavedLiveVideos(supabaseClient: TypedSupabaseClient) {
  return supabaseClient.from('videos').select(SAVED_LIVE_VIDEO_COLUMNS)
}

type SavedLiveVideoRow = QueryData<
  ReturnType<typeof selectSavedLiveVideos>
>[number]

/**
 * Flattens a row read with {@link selectSavedLiveVideos}.
 */
export function toSavedLiveVideo({
  twitch_video: { twitch_user, ...twitchVideo },
  ...video
}: SavedLiveVideoRow): SavedLiveVideo {
  return {
    ...video,
    twitch_video: twitchVideo,
    twitchUserId: twitch_user?.twitch_user_id ?? null,
  }
}

/**
 * Loads every Twitch row shown as LIVE.
 *
 * Talent status is deliberately ignored: a broadcast that was on air when its
 * talent retired still has to be ended, or it would stay LIVE forever.
 */
async function getSavedLiveVideos(
  supabaseClient: TypedSupabaseClient,
): Promise<SavedLiveVideo[]> {
  const { data, error } = await selectSavedLiveVideos(supabaseClient)
    .eq('platform', 'twitch')
    .eq('status', 'LIVE')
    .is('deleted_at', null)

  if (error) {
    throw new DatabaseError('Failed to load live Twitch videos', error)
  }

  return data.map(toSavedLiveVideo)
}

/**
 * Marks a broadcast as ended. When its archive is known the row takes over
 * the archive's details; otherwise it keeps standing in for the broadcast
 * until the archive is discovered (never, if VODs are disabled).
 */
async function endBroadcast(
  context: WriteContext,
  saved: SavedLiveVideo,
  /** The archive of the broadcast, when Twitch already lists it. */
  archive: TwitchVideo | undefined,
): Promise<void> {
  if (!archive) {
    await updateVideo(context.supabaseClient, saved.id, { status: 'ENDED' })
    return
  }

  await attachArchive(context, saved, archive, { stillLive: false })
}

/**
 * Looks up the archives of broadcasts that just ended, keyed by stream ID.
 * A failed lookup only delays taking over the archive's details, so failures
 * are reported and the broadcasts are ended regardless.
 */
async function getArchivesOfEndedBroadcasts(
  { fetcher, reportError }: CrawlContext<TwitchFetcher>,
  ended: readonly SavedLiveVideo[],
): Promise<Map<string, TwitchVideo>> {
  const twitchUserIds = ended
    .map((saved) => saved.twitchUserId)
    .filter((id) => id !== null)

  if (twitchUserIds.length === 0) {
    return new Map()
  }

  const { failures, videos } = await fetcher.getRecentVideos(twitchUserIds, {
    type: 'archive',
  })

  for (const { accountId, error } of failures) {
    reportError(error, { twitchUserId: accountId })
  }

  return toArchiveByStreamId(videos)
}

function toArchiveByStreamId(
  videos: readonly TwitchVideo[],
): Map<string, TwitchVideo> {
  const archiveByStreamId = new Map<string, TwitchVideo>()

  for (const video of videos) {
    const streamId = getArchivedStreamId(video)

    if (streamId) {
      archiveByStreamId.set(streamId, video)
    }
  }

  return archiveByStreamId
}

/**
 * Looks up the archive of one broadcast among the newest archives of its
 * broadcaster, as deep as one Helix page goes. Unlike
 * {@link getArchivesOfEndedBroadcasts}, a failed lookup rejects: it concerns a
 * single broadcast, which may have ended long ago.
 */
async function findArchiveOfBroadcast(
  fetcher: TwitchFetcher,
  saved: SavedLiveVideo,
): Promise<TwitchVideo | undefined> {
  const streamId = saved.twitch_video.stream_id

  if (!streamId || !saved.twitchUserId) {
    return undefined
  }

  const { failures, videos } = await fetcher.getRecentVideos(
    [saved.twitchUserId],
    { limit: TWITCH_API_MAX_RESULTS, type: 'archive' },
  )
  const [failure] = failures

  if (failure) {
    throw failure.error
  }

  return toArchiveByStreamId(videos).get(streamId)
}

/**
 * Keeps the LIVE state of Twitch broadcasts in sync:
 *
 * - a stream that went on air gets a LIVE row (Twitch has no scheduled
 *   broadcasts to register in advance, so this is how they are discovered)
 * - a row whose stream is on air is (re)marked LIVE and follows title changes
 * - a row whose stream went offline is ended and, when Twitch already lists
 *   the archive, takes over the archive's details
 *
 * @returns The number of broadcasts started, refreshed or ended.
 */
export async function syncTwitchLive(
  context: CrawlContext<TwitchFetcher>,
): Promise<number> {
  const { fetcher, logger, reportError, supabaseClient } = context
  const [users, savedLiveVideos] = await Promise.all([
    getActiveAccounts(supabaseClient, TWITCH_USERS),
    getSavedLiveVideos(supabaseClient),
  ])
  const userByTwitchId = new Map(users.map((user) => [user.platformId, user]))

  // Rows of accounts that are no longer crawled still need their stream state.
  const liveStreams = await fetcher.getLiveStreams([
    ...userByTwitchId.keys(),
    ...savedLiveVideos
      .map((saved) => saved.twitchUserId)
      .filter((id) => id !== null),
  ])

  const plan = planLiveSync({
    activeTwitchUserIds: new Set(userByTwitchId.keys()),
    liveStreams,
    savedByStreamId: await findSavedTwitchVideos(
      supabaseClient,
      'stream_id',
      liveStreams.map((stream) => stream.id),
    ),
    savedLiveVideos,
  })

  const startedCount = await countChanges(
    plan.started,
    WRITE_CONCURRENCY,
    async (stream) => {
      const user = userByTwitchId.get(stream.user_id)

      if (!user) {
        return false
      }

      return saveVideoWithThumbnail(
        context,
        TWITCH_NEW_VIDEOS,
        {
          fields: toLiveFields(stream),
          thumbnailUrl: stream.thumbnail_url,
          twitchVideo: {
            stream_id: stream.id,
            twitch_video_id: toLiveTwitchVideoId(stream.id),
            type: null,
          },
        },
        user,
      )
    },
    (error, stream) => reportError(error, { twitchStreamId: stream.id }),
  )

  const refreshedCount = await countChanges(
    plan.refreshed,
    WRITE_CONCURRENCY,
    async ({ saved, values }) => {
      await updateVideo(supabaseClient, saved.id, values)

      return true
    },
    (error, { saved }) => reportError(error, { videoId: saved.id }),
  )

  const archiveByStreamId = await getArchivesOfEndedBroadcasts(
    context,
    plan.ended,
  )

  const endedCount = await countChanges(
    plan.ended,
    WRITE_CONCURRENCY,
    async (saved) => {
      await endBroadcast(
        context,
        saved,
        saved.twitch_video.stream_id
          ? archiveByStreamId.get(saved.twitch_video.stream_id)
          : undefined,
      )

      return true
    },
    (error, saved) => reportError(error, { videoId: saved.id }),
  )

  const changedCount = startedCount + refreshedCount + endedCount

  if (changedCount > 0) {
    logger.info('TwitchのLIVE状態を同期しました', {
      ended: endedCount,
      refreshed: refreshedCount,
      started: startedCount,
    })
  }

  return changedCount
}

/**
 * Brings one saved broadcast in line with Twitch, the same way the scheduled
 * operations do:
 *
 * - while its stream is on air, the row is (re)marked LIVE and follows the
 *   title, like `refreshLiveVideos`
 * - once its stream is offline, a LIVE row is ended and takes over the
 *   archive's details when Twitch lists it, like `refreshLiveVideos`
 * - a placeholder still waiting for its archive is linked to it when Twitch
 *   lists it, like `addNewVideos`, and stays LIVE while the stream is on air
 *
 * No row is ever added for other broadcasts.
 */
export async function refreshTwitchBroadcast(
  context: CrawlContext<TwitchFetcher>,
  saved: SavedLiveVideo,
): Promise<void> {
  const { fetcher, supabaseClient } = context
  const liveStreams = saved.twitchUserId
    ? await fetcher.getLiveStreams([saved.twitchUserId])
    : []
  const plan = planLiveSync({
    activeTwitchUserIds: new Set(),
    liveStreams,
    savedByStreamId: [saved],
    savedLiveVideos: saved.status === 'LIVE' ? [saved] : [],
  })
  const hasEnded = plan.ended.length > 0
  const archive =
    hasEnded || isLivePlaceholder(saved)
      ? await findArchiveOfBroadcast(fetcher, saved)
      : undefined

  for (const { values } of plan.refreshed) {
    await updateVideo(supabaseClient, saved.id, values)
  }

  if (hasEnded) {
    await endBroadcast(context, saved, archive)
    return
  }

  if (archive && isLivePlaceholder(saved)) {
    // The same plan as `addNewVideos`, but applied without isolating failures:
    // a failed link has to reject. This row owns the stream ID, so the plan
    // can only link the archive to it, never insert a row.
    const actions = planNewVideos({
      liveStreams,
      savedByStreamId: [saved],
      savedByVideoId: await findSavedTwitchVideos(
        supabaseClient,
        'twitch_video_id',
        [archive.id],
      ),
      videos: [archive],
    })

    for (const action of actions) {
      await applyNewVideoAction(context, action, new Map())
    }
  }
}
