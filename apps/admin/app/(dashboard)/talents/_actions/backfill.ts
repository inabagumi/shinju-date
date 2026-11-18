'use server'

import { logger } from '@shinju-date/logger'
import {
  type BackfillProvider,
  BackfillQueue,
} from '@shinju-date/video-backfill'
import { PLATFORM_LABELS } from '@/components/platform-badge'
import {
  ActionError,
  type ActionResult,
  adminAction,
  parseActionInput,
} from '@/lib/action'
import { createAuditLog } from '@/lib/audit-log'
import { getRedisClient } from '@/lib/redis'
import {
  getTalentAccounts,
  readVideoBackfillStatus,
  type VideoBackfillStatus,
} from '../_lib/get-video-backfill-status'
import { backfillProviderSchema, talentIdSchema } from '../_lib/talent-schema'

/** 過去動画の取り込みをキューに追加できたときに、画面に知らせること */
interface BackfillRequestSummary {
  /** 成功のトーストに出す文 */
  message: string
}

/**
 * タレントの過去動画の取り込み（バックフィル）をキューに追加する。
 *
 * ## 仕様
 * - 指定したプラットフォームの紐づくアカウント（YouTube チャンネル / Twitch ユーザー）ごとに 1 ジョブを追加する
 * - 取り込みそのものはバッチの `/videos/backfill` が非同期に行う。ここでは API を呼ばない
 * - 待機中・処理中のジョブがあるアカウントは二重に追加しない
 * - 失敗・中断したジョブは続きから、完了したジョブは最新の動画から読み直す
 * - 1 件以上追加したら監査ログ（`VIDEO_BACKFILL`）に依頼者を残す
 * - 一部のアカウントだけを追加できなかったときは、成功として返し、`warnings` で知らせる
 */
export const requestVideoBackfillAction = adminAction(
  'requestVideoBackfillAction',
  async (
    { supabaseClient, user },
    id: string,
    platform: BackfillProvider,
  ): Promise<ActionResult<BackfillRequestSummary>> => {
    const talentId = parseActionInput(talentIdSchema, id)
    const provider = parseActionInput(backfillProviderSchema, platform)
    const label = PLATFORM_LABELS[provider]
    const talent = await getTalentAccounts(supabaseClient, talentId)

    if (!talent) {
      throw new ActionError('タレントが見つかりませんでした。')
    }

    const accounts = talent.accounts.filter(
      (account) => account.provider === provider,
    )

    if (accounts.length === 0) {
      throw new ActionError(
        `このタレントに紐づく${label}アカウントはありません。`,
      )
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
          provider,
          requestedBy: user.id,
          talentId,
        })

        if (result.enqueued) {
          enqueued.push(account)
        }
      } catch (error) {
        failed++
        logger.error('過去動画の取り込みをキューに追加できませんでした', {
          accountId: account.accountId,
          error,
          provider,
          talentId,
        })
      }
    }

    if (enqueued.length > 0) {
      await createAuditLog(supabaseClient, 'VIDEO_BACKFILL', talentId, {
        accounts: enqueued.map(({ accountId, name }) => ({ accountId, name })),
        entityName: talent.name,
        platform: provider,
      })
    }

    if (failed > 0 && enqueued.length === 0) {
      throw new ActionError(
        `${label}の過去動画の取り込みをキューに追加できませんでした。`,
      )
    }

    if (enqueued.length === 0) {
      throw new ActionError(`${label}の過去動画の取り込みは既に実行中です。`)
    }

    const skipped = accounts.length - enqueued.length - failed
    const message =
      skipped > 0
        ? `${label}の過去動画の取り込みを${enqueued.length}件キューに追加しました（実行中の${skipped}件は除く）。`
        : failed > 0
          ? `${label}の過去動画の取り込みを${enqueued.length}件キューに追加しました。`
          : `${label}の過去動画の取り込みをキューに追加しました。数分以内に開始されます。`

    return {
      data: { message },
      success: true,
      ...(failed > 0
        ? {
            warnings: [
              `${label}の過去動画の取り込みのうち、${failed}件はキューに追加できませんでした。`,
            ],
          }
        : {}),
    }
  },
)

/**
 * タレントの各アカウントの過去動画の取り込み状況を返す。定期的な再取得に使う。
 */
export const getVideoBackfillStatusAction = adminAction(
  'getVideoBackfillStatusAction',
  async (
    { supabaseClient },
    id: string,
  ): Promise<ActionResult<VideoBackfillStatus>> => {
    const talentId = parseActionInput(talentIdSchema, id)
    const status = await readVideoBackfillStatus(supabaseClient, talentId)

    if (!status) {
      throw new ActionError('タレントが見つかりませんでした。')
    }

    return { data: status, success: true }
  },
)
