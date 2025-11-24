'use server'

import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function toggleVisibilityAction(ids: string[]): Promise<{
  success: boolean
  error?: string
}> {
  if (!ids || ids.length === 0) {
    return { error: '動画が選択されていません。', success: false }
  }

  const supabaseClient = await createSupabaseServerClient()

  try {
    // Get current visibility status of all videos
    const { data: videos, error: fetchError } = await supabaseClient
      .from('videos')
      .select('id, title, visible')
      .in('id', ids)

    if (fetchError) {
      throw fetchError
    }

    if (!videos || videos.length === 0) {
      return { error: '動画が見つかりませんでした。', success: false }
    }

    const now = Temporal.Now.instant()

    // Toggle visibility for each video
    const updatePromises = videos.map((video) =>
      supabaseClient
        .from('videos')
        .update({
          updated_at: toDBString(now),
          visible: !video.visible,
        })
        .eq('id', video.id),
    )

    const results = await Promise.all(updatePromises)

    // Check if any update failed
    const hasError = results.some(({ error }) => error !== null)

    if (hasError) {
      return { error: '一部の動画の更新に失敗しました。', success: false }
    }

    // Log audit entries for each video
    await Promise.all(
      videos.map((video) =>
        createAuditLog('VIDEO_VISIBILITY_TOGGLE', 'videos', video.id, {
          entityName: video.title,
        }),
      ),
    )

    revalidatePath('/videos')
    await revalidateTags(['videos'])
    return { success: true }
  } catch (error) {
    logger.error('動画の表示切替に失敗しました', {
      error,
      ids: ids.join(','),
    })
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}

export async function toggleSingleVideoVisibilityAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabaseClient = await createSupabaseServerClient()

  try {
    // Get current visibility status
    const { data: video, error: fetchError } = await supabaseClient
      .from('videos')
      .select('id, title, visible')
      .eq('id', id)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!video) {
      return { error: '動画が見つかりませんでした。', success: false }
    }

    // Toggle visibility
    const { error: updateError } = await supabaseClient
      .from('videos')
      .update({
        updated_at: toDBString(Temporal.Now.instant()),
        visible: !video.visible,
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    // Log audit entry
    await createAuditLog('VIDEO_VISIBILITY_TOGGLE', 'videos', video.id, {
      entityName: video.title,
    })

    revalidatePath('/videos')
    await revalidateTags(['videos'])
    return { success: true }
  } catch (error) {
    logger.error('動画の表示切替に失敗しました', { error, id })
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}

export async function softDeleteAction(ids: string[]): Promise<{
  success: boolean
  error?: string
}> {
  if (!ids || ids.length === 0) {
    return { error: '動画が選択されていません。', success: false }
  }

  const supabaseClient = await createSupabaseServerClient()

  try {
    const now = Temporal.Now.instant()

    // Get thumbnail IDs before soft deleting videos
    const { data: videos, error: fetchError } = await supabaseClient
      .from('videos')
      .select('id, title, thumbnail_id')
      .in('id', ids)

    if (fetchError) {
      throw fetchError
    }

    if (!videos || videos.length === 0) {
      return { error: '動画が見つかりませんでした。', success: false }
    }

    // Soft delete videos
    const { error: videoError } = await supabaseClient
      .from('videos')
      .update({
        deleted_at: toDBString(now),
        updated_at: toDBString(now),
      })
      .in('id', ids)

    if (videoError) {
      throw videoError
    }

    // Soft delete associated thumbnails
    const thumbnailIds = videos
      .map((video) => video.thumbnail_id)
      .filter((id): id is string => id !== null)

    if (thumbnailIds.length > 0) {
      const { error: thumbnailError } = await supabaseClient
        .from('thumbnails')
        .update({
          deleted_at: toDBString(now),
          updated_at: toDBString(now),
        })
        .in('id', thumbnailIds)

      if (thumbnailError) {
        throw thumbnailError
      }
    }

    // Log audit entries for each video
    await Promise.all(
      videos.map((video) =>
        createAuditLog('VIDEO_DELETE', 'videos', video.id, {
          entityName: video.title,
        }),
      ),
    )

    revalidatePath('/videos')
    await revalidateTags(['videos'])
    return { success: true }
  } catch (error) {
    logger.error('動画の削除に失敗しました', { error, ids: ids.join(',') })
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}

export async function softDeleteSingleVideoAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabaseClient = await createSupabaseServerClient()

  try {
    const now = Temporal.Now.instant()

    // Get thumbnail ID before soft deleting video
    const { data: video, error: fetchError } = await supabaseClient
      .from('videos')
      .select('id, title, thumbnail_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!video) {
      return { error: '動画が見つかりませんでした。', success: false }
    }

    // Soft delete video
    const { error: videoError } = await supabaseClient
      .from('videos')
      .update({
        deleted_at: toDBString(now),
        updated_at: toDBString(now),
      })
      .eq('id', id)

    if (videoError) {
      throw videoError
    }

    // Soft delete associated thumbnail
    if (video.thumbnail_id) {
      const { error: thumbnailError } = await supabaseClient
        .from('thumbnails')
        .update({
          deleted_at: toDBString(now),
          updated_at: toDBString(now),
        })
        .eq('id', video.thumbnail_id)

      if (thumbnailError) {
        throw thumbnailError
      }
    }

    // Log audit entry
    await createAuditLog('VIDEO_DELETE', 'videos', video.id, {
      entityName: video.title,
    })

    revalidatePath('/videos')
    await revalidateTags(['videos'])
    return { success: true }
  } catch (error) {
    logger.error('動画の削除に失敗しました', { error, id })
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}

export async function restoreAction(ids: string[]): Promise<{
  success: boolean
  error?: string
}> {
  if (!ids || ids.length === 0) {
    return { error: '動画が選択されていません。', success: false }
  }

  const supabaseClient = await createSupabaseServerClient()

  try {
    const now = Temporal.Now.instant()

    // Get thumbnail IDs before restoring videos
    const { data: videos, error: fetchError } = await supabaseClient
      .from('videos')
      .select('id, title, thumbnail_id')
      .in('id', ids)

    if (fetchError) {
      throw fetchError
    }

    if (!videos || videos.length === 0) {
      return { error: '動画が見つかりませんでした。', success: false }
    }

    // Restore videos and thumbnails in parallel
    const thumbnailIds = videos
      .map((video) => video.thumbnail_id)
      .filter((id): id is string => id !== null)

    const videoRestorePromise = supabaseClient
      .from('videos')
      .update({
        deleted_at: null,
        updated_at: toDBString(now),
      })
      .in('id', ids)

    if (thumbnailIds.length > 0) {
      const thumbnailRestorePromise = supabaseClient
        .from('thumbnails')
        .update({
          deleted_at: null,
          updated_at: toDBString(now),
        })
        .in('id', thumbnailIds)

      const [videoResult, thumbnailResult] = await Promise.all([
        videoRestorePromise,
        thumbnailRestorePromise,
      ])

      if (videoResult.error) {
        throw videoResult.error
      }
      if (thumbnailResult.error) {
        throw thumbnailResult.error
      }
    } else {
      const { error: videoError } = await videoRestorePromise
      if (videoError) {
        throw videoError
      }
    }

    // Log audit entries for each video (non-blocking - failures won't affect restore success)
    await Promise.allSettled(
      videos.map((video) =>
        createAuditLog('VIDEO_RESTORE', 'videos', video.id, {
          entityName: video.title,
        }),
      ),
    )

    revalidatePath('/videos')
    await revalidateTags(['videos'])
    return { success: true }
  } catch (error) {
    logger.error('動画の復元に失敗しました', { error, ids: ids.join(',') })
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}
