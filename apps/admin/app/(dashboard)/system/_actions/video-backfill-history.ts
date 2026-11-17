'use server'

import { logger } from '@shinju-date/logger'
import { BackfillQueue } from '@shinju-date/video-backfill'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'
import { getRedisClient } from '@/lib/redis'
import { getBackfillAccounts } from '../_lib/backfill-accounts'
import {
  getLatestFailures,
  readVideoBackfillHistory,
  toFailedAccounts,
  type VideoBackfillHistory,
} from '../_lib/get-video-backfill-history'

/**
 * 終了した過去動画の取り込み（バックフィル）の履歴と、最後の取り込みが失敗したアカウントを返す。
 */
export async function getVideoBackfillHistoryAction(): Promise<
  VideoBackfillHistory | { error: string; success: false }
> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  try {
    return await readVideoBackfillHistory(auth.supabaseClient)
  } catch (error) {
    logger.error('過去動画の取り込みの履歴の取得に失敗しました', { error })

    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}

/**
 * 最後の過去動画の取り込みが失敗したアカウントを、まとめてキューに追加し直す。
 *
 * ## 仕様
 * - 対象は `video_backfill_latest_jobs` で最後の取り込みが失敗したアカウント（削除されたアカウント・タレントは除く）
 * - 取り込みそのものはバッチの `/videos/backfill` が非同期に行う。ここでは API を呼ばない
 * - 待機中・処理中のジョブがあるアカウントは二重に追加しない
 * - Redis にジョブが残っていれば失敗したところから、残っていなければ最新の動画から読み直す
 * - 全タレントの取得漏れチェックに属していたジョブは、そのままチェックの進捗に反映される
 * - 1 件以上追加したら監査ログ（`VIDEO_BACKFILL`）に依頼者を残す
 */
export async function retryFailedVideoBackfillJobsAction(): Promise<{
  success: boolean
  error?: string
  message?: string
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient, user } = auth

  try {
    const [latestFailures, { all }] = await Promise.all([
      getLatestFailures(supabaseClient),
      getBackfillAccounts(supabaseClient),
    ])
    const accounts = toFailedAccounts(latestFailures, all)

    if (accounts.length === 0) {
      return {
        error: '失敗した過去動画の取り込みはありません。',
        success: false,
      }
    }

    const queue = new BackfillQueue(getRedisClient())
    const enqueued: typeof accounts = []
    let failed = 0
    let lastError: unknown

    // One account that cannot be queued does not stop the others, and the
    // ones that were queued are recorded in any case.
    for (const account of accounts) {
      try {
        const result = await queue.enqueue({
          accountId: account.accountId,
          provider: account.provider,
          requestedBy: user.id,
          talentId: account.talentId,
        })

        if (result.enqueued) {
          enqueued.push(account)
        }
      } catch (error) {
        failed++
        lastError = error
        logger.error('過去動画の取り込みをキューに追加できませんでした', {
          accountId: account.accountId,
          error,
          provider: account.provider,
          talentId: account.talentId,
        })
      }
    }

    const skipped = accounts.length - enqueued.length - failed

    if (enqueued.length > 0) {
      await createAuditLog('VIDEO_BACKFILL', null, {
        accounts: enqueued.map(({ accountId, name, provider, talentId }) => ({
          accountId,
          name,
          provider,
          talentId,
        })),
        entityName: `失敗した過去動画の取り込みの再試行（${enqueued.length}件）`,
        failed,
        scope: 'retry',
        skipped,
      })
    }

    const reason =
      lastError instanceof Error ? lastError.message : '不明なエラー'

    if (enqueued.length === 0) {
      return {
        error:
          failed > 0
            ? `失敗した過去動画の取り込みをキューに追加できませんでした（${reason}）。`
            : '失敗した過去動画の取り込みは、すべて再試行中です。',
        success: false,
      }
    }

    const notes = [
      skipped > 0 ? `再試行中の${skipped}件は除く` : null,
      failed > 0 ? `${failed}件は追加できませんでした: ${reason}` : null,
    ].filter((note) => note !== null)
    const text = `失敗した過去動画の取り込みを${enqueued.length}件キューに追加しました${
      notes.length > 0 ? `（${notes.join('、')}）` : ''
    }。`

    return failed > 0
      ? { error: text, success: false }
      : { message: text, success: true }
  } catch (error) {
    logger.error('失敗した過去動画の取り込みの再試行に失敗しました', {
      error,
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
