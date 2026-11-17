'use server'

import { CACHE_TAGS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { createAuditLogs } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'

interface VideoVisibilityGroup {
  ids: string[]
  visible: boolean
}

export async function toggleVisibilityAction(ids: string[]): Promise<{
  success: boolean
  error?: string
  updatedCount?: number
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  if (!ids || ids.length === 0) {
    return { error: '動画が選択されていません。', success: false }
  }

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

    // 切り替え先ごとにまとめ、表示にする動画と非表示にする動画をそれぞれ1回で更新する
    const groups: VideoVisibilityGroup[] = [
      {
        ids: videos.filter((video) => !video.visible).map((video) => video.id),
        visible: true,
      },
      {
        ids: videos.filter((video) => video.visible).map((video) => video.id),
        visible: false,
      },
    ].filter((group) => group.ids.length > 0)

    const results = await Promise.all(
      groups.map((group) =>
        supabaseClient
          .from('videos')
          .update({
            updated_at: toDBString(now),
            visible: group.visible,
          })
          .in('id', group.ids)
          // 読み取った後にほかの操作で切り替わった動画は更新しない
          .eq('visible', !group.visible)
          .select('id, title'),
      ),
    )

    const updatedVideos = results.flatMap(({ data }) => data ?? [])

    for (const [index, { error }] of results.entries()) {
      if (error) {
        logger.error('動画の表示切替に失敗しました', {
          error,
          ids: groups[index]?.ids.join(','),
        })
      }
    }

    // 更新された動画には、一部が失敗した場合でも監査ログと再検証を行う
    if (updatedVideos.length > 0) {
      await createAuditLogs(
        supabaseClient,
        updatedVideos.map((video) => ({
          action: 'VIDEO_VISIBILITY_TOGGLE',
          details: { entityName: video.title },
          targetRecordId: video.id,
        })),
      )

      revalidatePath('/videos')

      for (const video of updatedVideos) {
        revalidatePath(`/videos/${video.id}`)
      }

      await revalidateTags([CACHE_TAGS.VIDEOS])
    }

    const failedCount = videos.length - updatedVideos.length

    if (failedCount > 0) {
      return {
        error:
          updatedVideos.length > 0
            ? `${updatedVideos.length} 件を更新し、${failedCount} 件は失敗しました。`
            : '動画の表示状態を更新できませんでした。',
        success: false,
        updatedCount: updatedVideos.length,
      }
    }

    return { success: true, updatedCount: updatedVideos.length }
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

export async function softDeleteAction(ids: string[]): Promise<{
  success: boolean
  error?: string
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  if (!ids || ids.length === 0) {
    return { error: '動画が選択されていません。', success: false }
  }

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

    // Soft delete videos (intentionally withdrawn — not restored with talent)
    const { error: videoError } = await supabaseClient
      .from('videos')
      .update({
        deleted_at: toDBString(now),
        deleted_reason: 'withdrawn',
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

    // Log audit entries for all videos with one call
    await createAuditLogs(
      supabaseClient,
      videos.map((video) => ({
        action: 'VIDEO_DELETE',
        details: { entityName: video.title },
        targetRecordId: video.id,
      })),
    )

    revalidatePath('/videos')
    await revalidateTags([CACHE_TAGS.VIDEOS])
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

export async function restoreAction(ids: string[]): Promise<{
  success: boolean
  error?: string
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  if (!ids || ids.length === 0) {
    return { error: '動画が選択されていません。', success: false }
  }

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
        deleted_reason: null,
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

    // Log audit entries for all videos with one call (a failure is logged and
    // does not affect the restore)
    await createAuditLogs(
      supabaseClient,
      videos.map((video) => ({
        action: 'VIDEO_RESTORE',
        details: { entityName: video.title },
        targetRecordId: video.id,
      })),
    )

    revalidatePath('/videos')
    await revalidateTags([CACHE_TAGS.VIDEOS])
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
