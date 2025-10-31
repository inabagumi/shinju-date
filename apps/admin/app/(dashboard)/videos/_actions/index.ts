'use server'

import { logger } from '@shinju-date/logger'
import { revalidatePath } from 'next/cache'
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
      .select('id, visible')
      .in('id', ids)

    if (fetchError) {
      throw fetchError
    }

    if (!videos || videos.length === 0) {
      return { error: '動画が見つかりませんでした。', success: false }
    }

    // Toggle visibility for each video
    const updatePromises = videos.map((video) =>
      supabaseClient
        .from('videos')
        .update({ visible: !video.visible })
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
        createAuditLog(supabaseClient, 'VIDEO_VISIBILITY_TOGGLE', video.id),
      ),
    )

    revalidatePath('/videos')
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
      .select('id, visible')
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
      .update({ visible: !video.visible })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    revalidatePath('/videos')
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
    const now = new Date().toISOString()

    // Get thumbnail IDs before soft deleting videos
    const { data: videos, error: fetchError } = await supabaseClient
      .from('videos')
      .select('id, thumbnail_id')
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
      .update({ deleted_at: now })
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
        .update({ deleted_at: now })
        .in('id', thumbnailIds)

      if (thumbnailError) {
        throw thumbnailError
      }
    }

    // Log audit entries for each video
    await Promise.all(
      videos.map((video) =>
        createAuditLog(supabaseClient, 'VIDEO_DELETE', video.id),
      ),
    )

    revalidatePath('/videos')
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
    const now = new Date().toISOString()

    // Get thumbnail ID before soft deleting video
    const { data: video, error: fetchError } = await supabaseClient
      .from('videos')
      .select('id, thumbnail_id')
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
      .update({ deleted_at: now })
      .eq('id', id)

    if (videoError) {
      throw videoError
    }

    // Soft delete associated thumbnail
    if (video.thumbnail_id) {
      const { error: thumbnailError } = await supabaseClient
        .from('thumbnails')
        .update({ deleted_at: now })
        .eq('id', video.thumbnail_id)

      if (thumbnailError) {
        throw thumbnailError
      }
    }

    revalidatePath('/videos')
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
