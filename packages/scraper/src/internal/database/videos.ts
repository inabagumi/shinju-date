import type { TablesInsert, TablesUpdate } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import type { TypedSupabaseClient } from '../../types.js'
import { chunk } from '../batch.js'
import { DatabaseError, isUniqueViolation } from './errors.js'

/** Keeps `in.(...)` filters comfortably below URL length limits. */
const IN_FILTER_CHUNK_SIZE = 100

export type NewVideo = Omit<TablesInsert<'videos'>, 'id'>

/** The platform-specific row that identifies a video on its source platform. */
export type NewPlatformVideo =
  | {
      platform: 'youtube'
      values: Omit<TablesInsert<'youtube_videos'>, 'id' | 'video_id'>
    }
  | {
      platform: 'twitch'
      values: Omit<TablesInsert<'twitch_videos'>, 'id' | 'video_id'>
    }

async function insertPlatformVideo(
  supabaseClient: TypedSupabaseClient,
  videoId: string,
  platformVideo: NewPlatformVideo,
) {
  if (platformVideo.platform === 'youtube') {
    const { error } = await supabaseClient
      .from('youtube_videos')
      .insert({ ...platformVideo.values, video_id: videoId })

    return error
  }

  const { error } = await supabaseClient
    .from('twitch_videos')
    .insert({ ...platformVideo.values, video_id: videoId })

  return error
}

/**
 * Inserts a video together with its platform row.
 *
 * The two inserts are not transactional, so a failed platform insert removes
 * the video row again: a video without its platform row could never be matched
 * to its source and would be inserted again on every run.
 *
 * @returns The new video ID, or `null` when the platform video already exists
 *   (another run saved it first).
 */
export async function insertVideo(
  supabaseClient: TypedSupabaseClient,
  video: NewVideo,
  platformVideo: NewPlatformVideo,
): Promise<string | null> {
  const videoId = crypto.randomUUID()

  const { error: videoError } = await supabaseClient
    .from('videos')
    .insert({ ...video, id: videoId })

  if (videoError) {
    throw new DatabaseError('Failed to insert a video', videoError)
  }

  const platformError = await insertPlatformVideo(
    supabaseClient,
    videoId,
    platformVideo,
  )

  if (!platformError) {
    return videoId
  }

  const { error: rollbackError } = await supabaseClient
    .from('videos')
    .delete()
    .eq('id', videoId)

  if (rollbackError) {
    throw new DatabaseError(
      'Failed to remove a video that has no platform row',
      rollbackError,
    )
  }

  if (isUniqueViolation(platformError)) {
    return null
  }

  throw new DatabaseError(
    `Failed to insert a ${platformVideo.platform} video`,
    platformError,
  )
}

/**
 * Updates the given columns of one video.
 */
export async function updateVideo(
  supabaseClient: TypedSupabaseClient,
  videoId: string,
  values: TablesUpdate<'videos'>,
): Promise<void> {
  const { error } = await supabaseClient
    .from('videos')
    .update(values)
    .eq('id', videoId)

  if (error) {
    throw new DatabaseError('Failed to update a video', error)
  }
}

export interface SoftDeleteVideosOptions {
  now: Temporal.Instant
  /** Thumbnails of the deleted videos, soft-deleted alongside them. */
  thumbnailIds?: readonly string[]
  videoIds: readonly string[]
}

/**
 * Soft-deletes videos that are no longer available on their source platform.
 *
 * Rows that were deleted in the meantime are left alone so their
 * `deleted_reason` (e.g. `withdrawn`) is never overwritten.
 *
 * @returns The number of videos that were deleted by this call.
 */
export async function softDeleteUnavailableVideos(
  supabaseClient: TypedSupabaseClient,
  { now, thumbnailIds = [], videoIds }: SoftDeleteVideosOptions,
): Promise<number> {
  const timestamp = toDBString(now)
  let deletedCount = 0

  for (const ids of chunk(videoIds, IN_FILTER_CHUNK_SIZE)) {
    const { data, error } = await supabaseClient
      .from('videos')
      .update({
        deleted_at: timestamp,
        deleted_reason: 'unavailable',
        updated_at: timestamp,
      })
      .in('id', ids)
      .is('deleted_at', null)
      .select('id')

    if (error) {
      throw new DatabaseError('Failed to soft-delete videos', error)
    }

    deletedCount += data.length
  }

  for (const ids of chunk(thumbnailIds, IN_FILTER_CHUNK_SIZE)) {
    const { error } = await supabaseClient
      .from('thumbnails')
      .update({
        deleted_at: timestamp,
        updated_at: timestamp,
      })
      .in('id', ids)
      .is('deleted_at', null)

    if (error) {
      throw new DatabaseError('Failed to soft-delete thumbnails', error)
    }
  }

  return deletedCount
}

/**
 * Returns which of the given YouTube video IDs are already saved, including
 * soft-deleted videos.
 */
export async function findSavedYouTubeVideoIds(
  supabaseClient: TypedSupabaseClient,
  youtubeVideoIds: readonly string[],
): Promise<Set<string>> {
  const savedIds = new Set<string>()

  for (const ids of chunk(youtubeVideoIds, IN_FILTER_CHUNK_SIZE)) {
    const { data, error } = await supabaseClient
      .from('youtube_videos')
      .select('youtube_video_id')
      .in('youtube_video_id', ids)

    if (error) {
      throw new DatabaseError('Failed to look up YouTube videos', error)
    }

    for (const row of data) {
      savedIds.add(row.youtube_video_id)
    }
  }

  return savedIds
}
