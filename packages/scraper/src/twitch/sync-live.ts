import type { TablesUpdate } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { toLiveTwitchVideoId } from '@shinju-date/twitch-api-client'
import { countChanges } from '../internal/concurrency.js'
import {
  DatabaseError,
  getActiveTwitchUsers,
  updateVideo,
} from '../internal/database/index.js'
import type {
  CrawlContext,
  TypedSupabaseClient,
  WriteContext,
} from '../types.js'
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

const WRITE_CONCURRENCY = 8

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

/**
 * Loads every Twitch row shown as LIVE.
 *
 * Talent status is deliberately ignored: a broadcast that was on air when its
 * talent retired still has to be ended, or it would stay LIVE forever.
 */
async function getSavedLiveVideos(
  supabaseClient: TypedSupabaseClient,
): Promise<SavedLiveVideo[]> {
  const { data, error } = await supabaseClient
    .from('videos')
    .select(
      'id, deleted_at, duration, published_at, status, thumbnail_id, title, twitch_video:twitch_videos!inner(id, stream_id, twitch_video_id, type, twitch_user:twitch_users(twitch_user_id))',
    )
    .eq('platform', 'twitch')
    .eq('status', 'LIVE')
    .is('deleted_at', null)

  if (error) {
    throw new DatabaseError('Failed to load live Twitch videos', error)
  }

  return data.map(
    ({ twitch_video: { twitch_user, ...twitchVideo }, ...video }) => ({
      ...video,
      twitch_video: twitchVideo,
      twitchUserId: twitch_user?.twitch_user_id ?? null,
    }),
  )
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
  const { now, supabaseClient } = context
  const timestamp = toDBString(now)

  if (!archive) {
    await updateVideo(supabaseClient, saved.id, {
      status: 'ENDED',
      updated_at: timestamp,
    })
    return
  }

  // Link first: should the next step fail, the row stays LIVE and the next
  // run ends it, instead of leaving an ended row without its archive.
  if (isLivePlaceholder(saved)) {
    await updateTwitchVideo(supabaseClient, saved.twitch_video.id, {
      twitch_video_id: archive.id,
      type: archive.type,
    })
  }

  const thumbnail = await createTwitchThumbnail(context, {
    thumbnailUrl: archive.thumbnail_url,
    twitchVideoId: archive.id,
  })

  await updateVideo(supabaseClient, saved.id, {
    ...toVideoFields(archive),
    updated_at: timestamp,
    ...(thumbnail ? { thumbnail_id: thumbnail.id } : {}),
  })
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
  const archiveByStreamId = new Map<string, TwitchVideo>()
  const twitchUserIds = ended
    .map((saved) => saved.twitchUserId)
    .filter((id) => id !== null)

  if (twitchUserIds.length === 0) {
    return archiveByStreamId
  }

  const { failures, videos } = await fetcher.getRecentVideos(twitchUserIds, {
    type: 'archive',
  })

  for (const { accountId, error } of failures) {
    reportError(error, { twitchUserId: accountId })
  }

  for (const video of videos) {
    if (video.type === 'archive' && video.stream_id) {
      archiveByStreamId.set(video.stream_id, video)
    }
  }

  return archiveByStreamId
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
  const { fetcher, logger, now, reportError, supabaseClient } = context
  const [users, savedLiveVideos] = await Promise.all([
    getActiveTwitchUsers(supabaseClient),
    getSavedLiveVideos(supabaseClient),
  ])
  const userByTwitchId = new Map(users.map((user) => [user.twitchUserId, user]))

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

      return saveTwitchVideo(context, {
        fields: toLiveFields(stream),
        thumbnailUrl: stream.thumbnail_url,
        twitchVideo: {
          stream_id: stream.id,
          twitch_video_id: toLiveTwitchVideoId(stream.id),
          type: null,
        },
        user,
      })
    },
    (error, stream) => reportError(error, { twitchStreamId: stream.id }),
  )

  const refreshedCount = await countChanges(
    plan.refreshed,
    WRITE_CONCURRENCY,
    async ({ saved, values }) => {
      await updateVideo(supabaseClient, saved.id, {
        ...values,
        updated_at: toDBString(now),
      })

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
