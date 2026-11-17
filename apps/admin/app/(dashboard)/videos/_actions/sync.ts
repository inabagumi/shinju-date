'use server'

import { CACHE_TAGS } from '@shinju-date/constants'
import type { Enums } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'
import { createScraper } from '@/lib/scraper'

export interface SyncVideoResult {
  error?: string
  message?: string
  success: boolean
  /** 動画がすでにプラットフォームと一致していた */
  unchanged?: boolean
}

const PLATFORM_LABELS: Record<Enums<'platform_type'>, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
}

const NOT_FOUND_RESULT: SyncVideoResult = {
  error: '動画が見つかりませんでした。',
  success: false,
}

async function revalidateVideo(videoId: string): Promise<void> {
  revalidatePath(`/videos/${videoId}`)
  revalidatePath('/videos')
  await revalidateTags([CACHE_TAGS.VIDEOS])
}

/**
 * 動画1件を、YouTube や Twitch の今の状態に合わせる。
 *
 * 見直しは `@shinju-date/scraper` の `refreshVideo` が行う。定期の見直しと同じ
 * 関数を使うので、同じ項目（タイトル、長さ、開始日時、状態、種別）が同じ値に
 * 更新され、プラットフォームから消えた動画は同じ理由（`unavailable`）で
 * 論理削除される。Twitch の配信中の行とアーカイブの結び付け、クリップの
 * 確認も含む。
 */
export async function syncVideoAction(
  videoId: string,
): Promise<SyncVideoResult> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  try {
    const { data: video, error: fetchError } = await supabaseClient
      .from('videos')
      .select('platform, title')
      .eq('id', videoId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    if (!video) {
      return NOT_FOUND_RESULT
    }

    const now = Temporal.Now.instant()
    const result = await createScraper(video.platform).refreshVideo(
      videoId,
      now,
    )

    switch (result.status) {
      case 'not-found':
        return NOT_FOUND_RESULT

      case 'unchanged':
        return {
          message: '動画情報は既に最新です。',
          success: true,
          unchanged: true,
        }

      case 'unavailable':
        await createAuditLog('VIDEO_SYNC', 'videos', videoId, {
          changes: {
            after: {
              deleted_at: toDBString(now),
              deleted_reason: 'unavailable',
            },
            before: { deleted_at: null },
          },
          entityName: video.title,
        })
        await revalidateVideo(videoId)

        return {
          message: `${PLATFORM_LABELS[video.platform]}で動画が見つからなかったため、動画を削除しました。`,
          success: true,
        }

      case 'updated':
        await createAuditLog('VIDEO_SYNC', 'videos', videoId, {
          changes: { after: result.after, before: result.before },
          entityName: result.title,
        })
        await revalidateVideo(videoId)

        return { message: '動画情報を同期しました。', success: true }
    }
  } catch (error) {
    logger.error('動画の同期に失敗しました', { error, videoId })

    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}
