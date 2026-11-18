'use server'

import { logger } from '@shinju-date/logger'
import { BackfillQueue } from '@shinju-date/video-backfill'
import { ActionError, type ActionResult, adminAction } from '@/lib/action'
import { createAuditLog } from '@/lib/audit-log'
import { getRedisClient } from '@/lib/redis'
import { getBackfillAccounts } from '../_lib/backfill-accounts'
import {
  getLatestFailures,
  readVideoBackfillHistory,
  toFailedAccounts,
  type VideoBackfillHistory,
} from '../_lib/get-video-backfill-history'

/** 失敗した過去動画の取り込みをキューに追加し直せたときに、画面に知らせること */
interface VideoBackfillRetrySummary {
  /** 成功のトーストに出す文 */
  message: string
}

/**
 * 終了した過去動画の取り込み（バックフィル）の履歴と、最後の取り込みが失敗したアカウントを返す。
 * 定期的な再取得に使う。
 */
export const getVideoBackfillHistoryAction = adminAction(
  'getVideoBackfillHistoryAction',
  async ({ supabaseClient }): Promise<ActionResult<VideoBackfillHistory>> => ({
    data: await readVideoBackfillHistory(supabaseClient),
    success: true,
  }),
)

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
 * - 一部のアカウントだけを追加できなかったときは、成功として返し、`warnings` で知らせる
 */
export const retryFailedVideoBackfillJobsAction = adminAction(
  'retryFailedVideoBackfillJobsAction',
  async ({
    supabaseClient,
    user,
  }): Promise<ActionResult<VideoBackfillRetrySummary>> => {
    const [latestFailures, { all }] = await Promise.all([
      getLatestFailures(supabaseClient),
      getBackfillAccounts(supabaseClient),
    ])
    const accounts = toFailedAccounts(latestFailures, all)

    if (accounts.length === 0) {
      throw new ActionError('失敗した過去動画の取り込みはありません。')
    }

    const queue = new BackfillQueue(getRedisClient())
    const enqueued: typeof accounts = []
    let failed = 0

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
      await createAuditLog(supabaseClient, 'VIDEO_BACKFILL', null, {
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

    if (enqueued.length === 0) {
      throw new ActionError(
        failed > 0
          ? '失敗した過去動画の取り込みをキューに追加できませんでした。'
          : '失敗した過去動画の取り込みは、すべて再試行中です。',
      )
    }

    const message = `失敗した過去動画の取り込みを${enqueued.length}件キューに追加しました${
      skipped > 0 ? `（再試行中の${skipped}件は除く）` : ''
    }。`

    return {
      data: { message },
      success: true,
      ...(failed > 0
        ? {
            warnings: [
              `失敗した過去動画の取り込みのうち、${failed}件はキューに追加できませんでした。`,
            ],
          }
        : {}),
    }
  },
)
