import { toDBString } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import type { TypedSupabaseClient } from '@/lib/supabase'
import { BATCH_LIMIT } from './constants'

interface CascadeVideoRow {
  id: string
  thumbnail_id: string | null
}

export interface CascadeFromTalentsResult {
  softDeleted: number
  restored: number
}

/**
 * Soft-delete videos under deleted talents, and restore cascade-deleted
 * videos when the parent talent is active again.
 *
 * Manual admin deletes (`deleted_reason = 'manual'`) are never restored here.
 */
export async function cascadeVideosFromTalents(
  supabaseClient: TypedSupabaseClient,
  options: { limit?: number } = {},
): Promise<CascadeFromTalentsResult> {
  const limit = options.limit ?? BATCH_LIMIT
  const now = Temporal.Now.instant()

  const softDeleted = await softDeleteVideosOfDeletedTalents(
    supabaseClient,
    now,
    limit,
  )
  const restored = await restoreCascadeDeletedVideos(supabaseClient, now, limit)

  return { restored, softDeleted }
}

async function softDeleteVideosOfDeletedTalents(
  supabaseClient: TypedSupabaseClient,
  now: Temporal.Instant,
  limit: number,
): Promise<number> {
  // Join filter: non-deleted videos whose parent talent is soft-deleted.
  const { data, error } = await supabaseClient
    .from('videos')
    .select('id, thumbnail_id, talents!inner(deleted_at)')
    .is('deleted_at', null)
    .not('talents.deleted_at', 'is', null)
    .order('id', { ascending: true })
    .limit(limit)

  if (error) {
    throw new TypeError(error.message, { cause: error })
  }

  const videos: CascadeVideoRow[] = (data ?? []).map((row) => ({
    id: row.id,
    thumbnail_id: row.thumbnail_id,
  }))

  if (videos.length === 0) {
    return 0
  }

  return softDeleteVideos(supabaseClient, videos, now)
}

async function restoreCascadeDeletedVideos(
  supabaseClient: TypedSupabaseClient,
  now: Temporal.Instant,
  limit: number,
): Promise<number> {
  // Only talent_cascade deletes under restored (non-deleted) talents.
  const { data, error } = await supabaseClient
    .from('videos')
    .select('id, thumbnail_id, talents!inner(deleted_at)')
    .eq('deleted_reason', 'talent_cascade')
    .not('deleted_at', 'is', null)
    .is('talents.deleted_at', null)
    .order('id', { ascending: true })
    .limit(limit)

  if (error) {
    throw new TypeError(error.message, { cause: error })
  }

  const videos: CascadeVideoRow[] = (data ?? []).map((row) => ({
    id: row.id,
    thumbnail_id: row.thumbnail_id,
  }))

  if (videos.length === 0) {
    return 0
  }

  return restoreVideos(supabaseClient, videos, now)
}

async function softDeleteVideos(
  supabaseClient: TypedSupabaseClient,
  videos: CascadeVideoRow[],
  now: Temporal.Instant,
): Promise<number> {
  const videoIds = videos.map((video) => video.id)
  const thumbnailIds = videos
    .map((video) => video.thumbnail_id)
    .filter((id): id is string => id !== null)

  const timestamp = toDBString(now)

  const { error: videoError } = await supabaseClient
    .from('videos')
    .update({
      deleted_at: timestamp,
      deleted_reason: 'talent_cascade',
      updated_at: timestamp,
    })
    .in('id', videoIds)

  if (videoError) {
    throw new TypeError(videoError.message, { cause: videoError })
  }

  if (thumbnailIds.length > 0) {
    const { error: thumbnailError } = await supabaseClient
      .from('thumbnails')
      .update({
        deleted_at: timestamp,
        updated_at: timestamp,
      })
      .in('id', thumbnailIds)
      .is('deleted_at', null)

    if (thumbnailError) {
      throw new TypeError(thumbnailError.message, { cause: thumbnailError })
    }
  }

  return videoIds.length
}

async function restoreVideos(
  supabaseClient: TypedSupabaseClient,
  videos: CascadeVideoRow[],
  now: Temporal.Instant,
): Promise<number> {
  const videoIds = videos.map((video) => video.id)
  const thumbnailIds = videos
    .map((video) => video.thumbnail_id)
    .filter((id): id is string => id !== null)

  const timestamp = toDBString(now)

  const { error: videoError } = await supabaseClient
    .from('videos')
    .update({
      deleted_at: null,
      deleted_reason: null,
      updated_at: timestamp,
    })
    .in('id', videoIds)

  if (videoError) {
    throw new TypeError(videoError.message, { cause: videoError })
  }

  if (thumbnailIds.length > 0) {
    const { error: thumbnailError } = await supabaseClient
      .from('thumbnails')
      .update({
        deleted_at: null,
        updated_at: timestamp,
      })
      .in('id', thumbnailIds)

    if (thumbnailError) {
      throw new TypeError(thumbnailError.message, { cause: thumbnailError })
    }
  }

  return videoIds.length
}
