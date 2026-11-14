import { toDBString } from '@shinju-date/temporal-fns'
import { countChanges } from '../internal/concurrency.js'
import {
  DatabaseError,
  paginateById,
  softDeleteUnavailableVideos,
  updateVideo,
} from '../internal/database/index.js'
import type {
  CrawlContext,
  TypedSupabaseClient,
  WriteContext,
} from '../types.js'
import type { TwitchFetcher } from './fetcher.js'
import { createTwitchThumbnail } from './save-video.js'
import {
  isLivePlaceholder,
  type SavedTwitchVideo,
  updateTwitchVideo,
} from './saved-video.js'
import {
  getVideoChanges,
  type TwitchVideoFields,
  type TwitchVideoType,
  toClipFields,
  toVideoFields,
} from './video.js'

const UPDATE_CONCURRENCY = 8

/** How many of the newest finished videos a refresh re-reads. */
const RECENT_VIDEO_COUNT = 100

/** Page size of the full sweep; PostgREST caps responses at 1000 rows. */
const SWEEP_PAGE_SIZE = 1000

const SAVED_VIDEO_SELECT =
  'id, deleted_at, duration, published_at, status, thumbnail_id, title, twitch_video:twitch_videos!inner(id, stream_id, twitch_video_id, type), talent:talents!inner(id)'

/** What Twitch reports for one saved video or clip. */
interface FetchedVideo {
  fields: TwitchVideoFields
  thumbnailUrl: string
  type: TwitchVideoType
}

interface TwitchLookupResult {
  fetchedById: Map<string, FetchedVideo>
  missingIds: string[]
}

/**
 * Looks up saved videos on Twitch. Clips live behind a different Helix
 * endpoint than videos, and placeholders of broadcasts without an archive
 * have no Helix resource at all, so those are left out.
 */
async function lookUpOnTwitch(
  fetcher: TwitchFetcher,
  savedVideos: readonly SavedTwitchVideo[],
): Promise<TwitchLookupResult> {
  const lookedUp = savedVideos.filter((saved) => !isLivePlaceholder(saved))
  const clipIds = lookedUp
    .filter((saved) => saved.twitch_video.type === 'clip')
    .map((saved) => saved.twitch_video.twitch_video_id)
  const videoIds = lookedUp
    .filter((saved) => saved.twitch_video.type !== 'clip')
    .map((saved) => saved.twitch_video.twitch_video_id)

  const [videoResult, clipResult] = await Promise.all([
    fetcher.getVideos(videoIds),
    fetcher.getClips(clipIds),
  ])
  const fetchedById = new Map<string, FetchedVideo>()

  for (const video of videoResult.videos) {
    fetchedById.set(video.id, {
      fields: toVideoFields(video),
      thumbnailUrl: video.thumbnail_url,
      type: video.type,
    })
  }

  for (const clip of clipResult.clips) {
    fetchedById.set(clip.id, {
      fields: toClipFields(clip),
      thumbnailUrl: clip.thumbnail_url,
      type: 'clip',
    })
  }

  return {
    fetchedById,
    missingIds: [...videoResult.missingIds, ...clipResult.missingIds],
  }
}

/**
 * @returns Whether the saved video changed.
 */
async function refreshVideo(
  context: WriteContext,
  saved: SavedTwitchVideo,
  fetched: FetchedVideo,
): Promise<boolean> {
  const { now, supabaseClient } = context
  const changes = getVideoChanges(saved, fetched.fields) ?? {}

  // Twitch has no thumbnail for a VOD until some time after the broadcast, so
  // videos saved before that get theirs here.
  if (!saved.thumbnail_id) {
    const thumbnail = await createTwitchThumbnail(context, {
      thumbnailUrl: fetched.thumbnailUrl,
      twitchVideoId: saved.twitch_video.twitch_video_id,
    })

    if (thumbnail) {
      changes.thumbnail_id = thumbnail.id
    }
  }

  const typeChanged = saved.twitch_video.type !== fetched.type

  if (typeChanged) {
    await updateTwitchVideo(supabaseClient, saved.twitch_video.id, {
      type: fetched.type,
    })
  }

  if (Object.keys(changes).length > 0) {
    await updateVideo(supabaseClient, saved.id, {
      ...changes,
      updated_at: toDBString(now),
    })

    return true
  }

  return typeChanged
}

async function deleteMissingVideos(
  { logger, now, supabaseClient }: WriteContext,
  missingIds: readonly string[],
  savedByTwitchId: ReadonlyMap<string, SavedTwitchVideo>,
): Promise<number> {
  const missingVideos = missingIds
    .map((id) => savedByTwitchId.get(id))
    .filter((saved) => saved !== undefined)

  if (missingVideos.length === 0) {
    return 0
  }

  const deletedCount = await softDeleteUnavailableVideos(supabaseClient, {
    now,
    thumbnailIds: missingVideos
      .map((saved) => saved.thumbnail_id)
      .filter((id) => id !== null),
    videoIds: missingVideos.map((saved) => saved.id),
  })

  logger.info('公開されなくなった動画を削除しました', {
    count: deletedCount,
    platform: 'twitch',
    twitchVideoIds: missingIds.join(','),
  })

  return deletedCount
}

function toSavedByTwitchId(
  savedVideos: readonly SavedTwitchVideo[],
): Map<string, SavedTwitchVideo> {
  return new Map(
    savedVideos.map((saved) => [saved.twitch_video.twitch_video_id, saved]),
  )
}

/**
 * Brings the newest finished Twitch videos of active talents in line with
 * Twitch: updates what changed (title, duration, type), fills in thumbnails
 * that were not available yet and soft-deletes videos Twitch no longer returns.
 *
 * @returns The number of videos updated or deleted.
 */
export async function refreshRecentTwitchVideos(
  context: CrawlContext<TwitchFetcher>,
): Promise<number> {
  const { fetcher, logger, reportError, supabaseClient } = context
  const { data: savedVideos, error } = await supabaseClient
    .from('videos')
    .select(SAVED_VIDEO_SELECT)
    .eq('platform', 'twitch')
    .is('deleted_at', null)
    .is('talent.deleted_at', null)
    .eq('talent.status', 'active')
    .in('status', ['ENDED', 'PUBLISHED'])
    .order('published_at', { ascending: false })
    .limit(RECENT_VIDEO_COUNT)

  if (error) {
    throw new DatabaseError('Failed to load Twitch videos to refresh', error)
  }

  if (savedVideos.length === 0) {
    return 0
  }

  const savedByTwitchId = toSavedByTwitchId(savedVideos)
  const { fetchedById, missingIds } = await lookUpOnTwitch(fetcher, savedVideos)

  const updatedCount = await countChanges(
    [...fetchedById],
    UPDATE_CONCURRENCY,
    async ([twitchVideoId, fetched]) => {
      const saved = savedByTwitchId.get(twitchVideoId)

      return saved ? refreshVideo(context, saved, fetched) : false
    },
    (error, [twitchVideoId]) => reportError(error, { twitchVideoId }),
  )

  if (updatedCount > 0) {
    logger.info('動画を更新しました', {
      count: updatedCount,
      platform: 'twitch',
      scope: 'recent',
    })
  }

  const deletedCount = await deleteMissingVideos(
    context,
    missingIds,
    savedByTwitchId,
  )

  return updatedCount + deletedCount
}

async function getSweepPage(
  supabaseClient: TypedSupabaseClient,
  cursor: string | undefined,
): Promise<SavedTwitchVideo[]> {
  let query = supabaseClient
    .from('videos')
    .select(SAVED_VIDEO_SELECT)
    .eq('platform', 'twitch')
    .is('deleted_at', null)
    .is('talent.deleted_at', null)
    .order('id', { ascending: true })
    .limit(SWEEP_PAGE_SIZE)

  if (cursor) {
    query = query.gt('id', cursor)
  }

  const { data, error } = await query

  if (error) {
    throw new DatabaseError('Failed to load Twitch videos to sweep', error)
  }

  return data
}

/**
 * Checks every saved Twitch video of non-deleted talents (retired ones
 * included) and soft-deletes those Twitch no longer returns. Details are not
 * refreshed.
 *
 * @returns The number of videos deleted.
 */
export async function removeUnavailableTwitchVideos(
  context: CrawlContext<TwitchFetcher>,
): Promise<number> {
  const { fetcher, supabaseClient } = context
  let deletedCount = 0

  for await (const page of paginateById((cursor) =>
    getSweepPage(supabaseClient, cursor),
  )) {
    const { missingIds } = await lookUpOnTwitch(fetcher, page)

    deletedCount += await deleteMissingVideos(
      context,
      missingIds,
      toSavedByTwitchId(page),
    )
  }

  return deletedCount
}
