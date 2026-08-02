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
 * Error from cascade processing that preserves partial phase counts so callers
 * can log/revalidate work that already committed.
 */
export class CascadePhaseError extends Error {
  readonly softDeleted: number
  readonly restored: number

  constructor(
    message: string,
    options: {
      softDeleted: number
      restored: number
      cause?: unknown
    },
  ) {
    super(message, { cause: options.cause })
    this.name = 'CascadePhaseError'
    this.softDeleted = options.softDeleted
    this.restored = options.restored
  }
}

/**
 * Soft-delete videos under deleted talents, and restore those marked
 * `talent_deleted` when the parent talent is active again.
 *
 * `unavailable` (source gone) and `withdrawn` (intentional) are never restored here.
 * Soft-delete and restore run independently so a failure in one phase does not
 * hide the other phase's committed count.
 */
export async function cascadeVideosFromTalents(
  supabaseClient: TypedSupabaseClient,
  options: { limit?: number } = {},
): Promise<CascadeFromTalentsResult> {
  const limit = options.limit ?? BATCH_LIMIT
  const now = Temporal.Now.instant()

  let softDeleted = 0
  let restored = 0
  const phaseErrors: Error[] = []

  try {
    softDeleted = await softDeleteVideosOfDeletedTalents(
      supabaseClient,
      now,
      limit,
    )
  } catch (error) {
    phaseErrors.push(toError(error))
  }

  try {
    restored = await restoreCascadeDeletedVideos(supabaseClient, now, limit)
  } catch (error) {
    phaseErrors.push(toError(error))
  }

  if (phaseErrors.length > 0) {
    throw new CascadePhaseError(
      `cascade phase failed (softDeleted=${softDeleted}, restored=${restored}): ${phaseErrors.map((error) => error.message).join('; ')}`,
      {
        cause:
          phaseErrors.length === 1
            ? phaseErrors[0]
            : new AggregateError(phaseErrors),
        restored,
        softDeleted,
      },
    )
  }

  return { restored, softDeleted }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
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
  // Only talent_deleted under restored (non-deleted) talents.
  const { data, error } = await supabaseClient
    .from('videos')
    .select('id, thumbnail_id, talents!inner(deleted_at)')
    .eq('deleted_reason', 'talent_deleted')
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
  const timestamp = toDBString(now)

  // Re-check deleted_at so concurrent admin/sync deletes are not overwritten.
  const { data: updatedVideos, error: videoError } = await supabaseClient
    .from('videos')
    .update({
      deleted_at: timestamp,
      deleted_reason: 'talent_deleted',
      updated_at: timestamp,
    })
    .in('id', videoIds)
    .is('deleted_at', null)
    .select('id')

  if (videoError) {
    throw new TypeError(videoError.message, { cause: videoError })
  }

  const updatedIds = new Set((updatedVideos ?? []).map((video) => video.id))
  const thumbnailIds = videos
    .filter((video) => updatedIds.has(video.id))
    .map((video) => video.thumbnail_id)
    .filter((id): id is string => id !== null)

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

  return updatedIds.size
}

async function restoreVideos(
  supabaseClient: TypedSupabaseClient,
  videos: CascadeVideoRow[],
  now: Temporal.Instant,
): Promise<number> {
  const videoIds = videos.map((video) => video.id)
  const timestamp = toDBString(now)

  // Re-check deleted_reason so concurrent admin changes are not overwritten.
  const { data: updatedVideos, error: videoError } = await supabaseClient
    .from('videos')
    .update({
      deleted_at: null,
      deleted_reason: null,
      updated_at: timestamp,
    })
    .in('id', videoIds)
    .eq('deleted_reason', 'talent_deleted')
    .select('id')

  if (videoError) {
    throw new TypeError(videoError.message, { cause: videoError })
  }

  const updatedIds = new Set((updatedVideos ?? []).map((video) => video.id))
  const thumbnailIds = videos
    .filter((video) => updatedIds.has(video.id))
    .map((video) => video.thumbnail_id)
    .filter((id): id is string => id !== null)

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

  return updatedIds.size
}
