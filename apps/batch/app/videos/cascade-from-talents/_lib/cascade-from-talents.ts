import { throwIfError } from '@shinju-date/scraper'
import { toDBString } from '@shinju-date/temporal-fns'
import type { TypedSupabaseClient } from '@/lib/supabase'
import { BATCH_LIMIT } from './constants'

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
    restored = await restoreCascadeDeletedVideos(supabaseClient, limit)
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
  const videos = throwIfError(
    await supabaseClient
      .from('videos')
      .select('id, talents!inner(deleted_at)')
      .is('deleted_at', null)
      .not('talents.deleted_at', 'is', null)
      .order('id', { ascending: true })
      .limit(limit),
    'Failed to load videos of deleted talents',
  )

  if (videos.length === 0) {
    return 0
  }

  // The function deletes the thumbnails with the videos in one transaction,
  // and skips videos deleted meanwhile (by an admin or the sync) so their
  // reason is not overwritten.
  const deletedIds = throwIfError(
    await supabaseClient.rpc('soft_delete_videos', {
      p_deleted_at: toDBString(now),
      p_reason: 'talent_deleted',
      p_video_ids: videos.map((video) => video.id),
    }),
    'Failed to soft-delete videos of deleted talents',
  )

  return deletedIds.length
}

async function restoreCascadeDeletedVideos(
  supabaseClient: TypedSupabaseClient,
  limit: number,
): Promise<number> {
  // Only talent_deleted under restored (non-deleted) talents.
  const videos = throwIfError(
    await supabaseClient
      .from('videos')
      .select('id, talents!inner(deleted_at)')
      .eq('deleted_reason', 'talent_deleted')
      .not('deleted_at', 'is', null)
      .is('talents.deleted_at', null)
      .order('id', { ascending: true })
      .limit(limit),
    'Failed to load videos of restored talents',
  )

  if (videos.length === 0) {
    return 0
  }

  // The function restores the thumbnails with the videos in one transaction,
  // and only the videos still deleted as talent_deleted, so a video an admin
  // withdrew meanwhile stays deleted.
  const restoredIds = throwIfError(
    await supabaseClient.rpc('restore_videos', {
      p_reason: 'talent_deleted',
      p_video_ids: videos.map((video) => video.id),
    }),
    'Failed to restore videos of restored talents',
  )

  return restoredIds.length
}
