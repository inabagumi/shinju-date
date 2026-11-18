'use server'

import { CACHE_TAGS } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { ActionError, type ActionResult, adminAction } from '@/lib/action'
import { createAuditLogs } from '@/lib/audit-log'
import type { AuthenticatedContext } from '@/lib/auth'

/** まとめて操作する動画の、読み取った行 */
type BulkVideo = Pick<
  Tables<'videos'>,
  'id' | 'thumbnail_id' | 'title' | 'visible'
>

/** 更新された動画（監査ログと再検証に使う） */
type UpdatedVideo = Pick<Tables<'videos'>, 'id' | 'title'>

/** 動画をまとめて操作したときの戻り値 */
export interface BulkVideoActionData {
  /** 更新された動画の件数 */
  updatedCount: number
}

interface BulkVideoUpdateContext extends AuthenticatedContext {
  /** 選ばれた動画のうち、見つかったもの */
  videos: BulkVideo[]
  /** 更新日時などに使う、今の日時（`toDBString` 済み） */
  now: string
}

interface BulkVideoActionOptions {
  ids: string[]
  /**
   * 動画を更新し、実際に更新された動画を返す。一部だけ更新できたときは、
   * 更新できたぶんだけを返す（監査ログと再検証は、返した動画だけに行う）
   */
  update: (context: BulkVideoUpdateContext) => Promise<UpdatedVideo[]>
  /** 監査ログに記録するアクション（詳細には動画のタイトルを記録する） */
  auditAction: 'VIDEO_DELETE' | 'VIDEO_RESTORE' | 'VIDEO_VISIBILITY_TOGGLE'
}

/**
 * 動画の表示切り替え・削除・復元に共通する処理。
 * 選ばれた動画を読み、`update` で更新し、更新された動画の監査ログを書き、再検証する。
 * 一部だけ更新できたときは、更新できたぶんの監査ログと再検証を行ってから、件数を知らせる。
 */
async function runBulkVideoAction(
  context: AuthenticatedContext,
  { auditAction, ids, update }: BulkVideoActionOptions,
): Promise<ActionResult<BulkVideoActionData>> {
  const { supabaseClient } = context

  if (!ids || ids.length === 0) {
    throw new ActionError('動画が選択されていません。')
  }

  const { data: videos, error: fetchError } = await supabaseClient
    .from('videos')
    .select('id, thumbnail_id, title, visible')
    .in('id', ids)

  if (fetchError) {
    throw fetchError
  }

  if (!videos || videos.length === 0) {
    throw new ActionError('動画が見つかりませんでした。')
  }

  const updatedVideos = await update({
    ...context,
    now: toDBString(Temporal.Now.instant()),
    videos,
  })

  if (updatedVideos.length > 0) {
    await createAuditLogs(
      supabaseClient,
      updatedVideos.map((video) => ({
        action: auditAction,
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
    throw new ActionError(
      `${updatedVideos.length} 件を更新し、${failedCount} 件は失敗しました。`,
    )
  }

  return { data: { updatedCount: updatedVideos.length }, success: true }
}

function thumbnailIdsOf(videos: readonly BulkVideo[]): string[] {
  return videos
    .map((video) => video.thumbnail_id)
    .filter((id): id is string => id !== null)
}

export const toggleVisibilityAction = adminAction(
  'toggleVisibilityAction',
  (context, ids: string[]) =>
    runBulkVideoAction(context, {
      auditAction: 'VIDEO_VISIBILITY_TOGGLE',
      ids,
      update: async ({ now, supabaseClient, videos }) => {
        // 切り替え先ごとにまとめ、表示にする動画と非表示にする動画をそれぞれ1回で更新する
        const groups = [
          {
            ids: videos.filter((video) => !video.visible).map(({ id }) => id),
            visible: true,
          },
          {
            ids: videos.filter((video) => video.visible).map(({ id }) => id),
            visible: false,
          },
        ].filter((group) => group.ids.length > 0)

        const results = await Promise.all(
          groups.map((group) =>
            supabaseClient
              .from('videos')
              .update({ updated_at: now, visible: group.visible })
              .in('id', group.ids)
              // 読み取った後にほかの操作で切り替わった動画は更新しない
              .eq('visible', !group.visible)
              .select('id, title'),
          ),
        )

        for (const [index, { error }] of results.entries()) {
          if (error) {
            logger.error('動画の表示切替に失敗しました', {
              error,
              ids: groups[index]?.ids.join(','),
            })
          }
        }

        const updatedVideos = results.flatMap(({ data }) => data ?? [])

        if (updatedVideos.length === 0) {
          throw new ActionError('動画の表示状態を更新できませんでした。')
        }

        return updatedVideos
      },
    }),
)

export const softDeleteAction = adminAction(
  'softDeleteAction',
  (context, ids: string[]) =>
    runBulkVideoAction(context, {
      auditAction: 'VIDEO_DELETE',
      ids,
      update: async ({ now, supabaseClient, videos }) => {
        // Soft delete videos (intentionally withdrawn — not restored with talent)
        const { error: videoError } = await supabaseClient
          .from('videos')
          .update({
            deleted_at: now,
            deleted_reason: 'withdrawn',
            updated_at: now,
          })
          .in(
            'id',
            videos.map(({ id }) => id),
          )

        if (videoError) {
          throw videoError
        }

        const thumbnailIds = thumbnailIdsOf(videos)

        if (thumbnailIds.length > 0) {
          const { error: thumbnailError } = await supabaseClient
            .from('thumbnails')
            .update({ deleted_at: now, updated_at: now })
            .in('id', thumbnailIds)

          if (thumbnailError) {
            throw thumbnailError
          }
        }

        return videos
      },
    }),
)

export const restoreAction = adminAction(
  'restoreAction',
  (context, ids: string[]) =>
    runBulkVideoAction(context, {
      auditAction: 'VIDEO_RESTORE',
      ids,
      update: async ({ now, supabaseClient, videos }) => {
        const thumbnailIds = thumbnailIdsOf(videos)

        // Restore videos and thumbnails in parallel
        const results = await Promise.all([
          supabaseClient
            .from('videos')
            .update({
              deleted_at: null,
              deleted_reason: null,
              updated_at: now,
            })
            .in(
              'id',
              videos.map(({ id }) => id),
            ),
          ...(thumbnailIds.length > 0
            ? [
                supabaseClient
                  .from('thumbnails')
                  .update({ deleted_at: null, updated_at: now })
                  .in('id', thumbnailIds),
              ]
            : []),
        ])

        for (const { error } of results) {
          if (error) {
            throw error
          }
        }

        return videos
      },
    }),
)
