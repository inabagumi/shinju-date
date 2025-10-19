'use server'

import { revalidatePath } from 'next/cache'
import { supabaseClient } from '@/lib/supabase'

export async function toggleVisibilityAction(slugs: string[]): Promise<{
  success: boolean
  error?: string
}> {
  if (!slugs || slugs.length === 0) {
    return { error: '動画が選択されていません。', success: false }
  }

  try {
    // Get current visibility status of all videos
    const { data: videos, error: fetchError } = await supabaseClient
      .from('videos')
      .select('slug, visible')
      .in('slug', slugs)

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
        .eq('slug', video.slug),
    )

    const results = await Promise.all(updatePromises)

    // Check if any update failed
    const hasError = results.some(({ error }) => error !== null)

    if (hasError) {
      return { error: '一部の動画の更新に失敗しました。', success: false }
    }

    revalidatePath('/videos')
    return { success: true }
  } catch (error) {
    console.error('Toggle visibility error:', error)
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}

export async function softDeleteAction(slugs: string[]): Promise<{
  success: boolean
  error?: string
}> {
  if (!slugs || slugs.length === 0) {
    return { error: '動画が選択されていません。', success: false }
  }

  try {
    const now = new Date().toISOString()

    // Get thumbnail IDs before soft deleting videos
    const { data: videos, error: fetchError } = await supabaseClient
      .from('videos')
      .select('slug, thumbnail_id')
      .in('slug', slugs)

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
      .in('slug', slugs)

    if (videoError) {
      throw videoError
    }

    // Soft delete associated thumbnails
    const thumbnailIds = videos
      .map((video) => video.thumbnail_id)
      .filter((id): id is number => id !== null)

    if (thumbnailIds.length > 0) {
      const { error: thumbnailError } = await supabaseClient
        .from('thumbnails')
        .update({ deleted_at: now })
        .in('id', thumbnailIds)

      if (thumbnailError) {
        throw thumbnailError
      }
    }

    revalidatePath('/videos')
    return { success: true }
  } catch (error) {
    console.error('Soft delete error:', error)
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}
