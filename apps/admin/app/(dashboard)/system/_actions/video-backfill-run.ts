'use server'

import { logger } from '@shinju-date/logger'
import { BackfillRuns } from '@shinju-date/video-backfill'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'
import { getRedisClient } from '@/lib/redis'
import { getBackfillAccounts } from '../_lib/backfill-accounts'
import {
  countTargets,
  readVideoBackfillRun,
  type VideoBackfillRunState,
} from '../_lib/get-video-backfill-run'

/**
 * 全 active タレントの過去動画の取り込み（取得漏れチェック）をキューに追加する。
 *
 * ## 仕様
 * - active なタレントに紐づく全アカウント（YouTube チャンネル / Twitch ユーザー）ごとに 1 ジョブを追加し、
 *   それらを 1 回のチェックとしてまとめる
 * - 取り込みそのものはバッチの `/videos/backfill` が非同期に行う。ここでは API を呼ばない
 * - 前回のチェックが実行中のとき、または同時に別の依頼を処理しているときは追加しない
 * - タレント詳細から依頼されて待機中・処理中のアカウントは二重に追加しない
 * - 失敗・中断したジョブは続きから、完了したジョブは最新の動画から読み直す
 * - 1 件以上追加したら監査ログ（`VIDEO_BACKFILL`）に依頼者を残す
 */
export async function requestVideoBackfillRunAction(): Promise<{
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
    const { targets } = await getBackfillAccounts(supabaseClient)

    if (targets.length === 0) {
      return {
        error: 'active なタレントに紐づくアカウントはありません。',
        success: false,
      }
    }

    let lastError: unknown
    const result = await new BackfillRuns(getRedisClient()).start(targets, {
      onError: (request, error) => {
        lastError = error
        logger.error('過去動画の取り込みをキューに追加できませんでした', {
          accountId: request.accountId,
          error,
          provider: request.provider,
          talentId: request.talentId,
        })
      },
      requestedBy: user.id,
    })
    const reason =
      lastError instanceof Error ? lastError.message : '不明なエラー'

    switch (result.status) {
      case 'active':
        return {
          error: '全タレントの取得漏れチェックは既に実行中です。',
          success: false,
        }
      case 'busy':
        return {
          error:
            '別の取得漏れチェックの依頼を処理しています。しばらくしてから再度お試しください。',
          success: false,
        }
      case 'empty':
        return {
          error:
            result.failed > 0
              ? `取得漏れチェックをキューに追加できませんでした（${reason}）。`
              : 'すべてのアカウントで過去動画の取り込みが実行中です。',
          success: false,
        }
    }

    const { failed, run, skipped } = result

    await createAuditLog('VIDEO_BACKFILL', run.id, {
      accounts: run.jobs.length,
      entityName: `全タレントの取得漏れチェック（${run.jobs.length}件）`,
      failed,
      scope: 'all',
      skipped,
      targets: countTargets(targets),
    })

    const notes = [
      skipped > 0 ? `実行中の${skipped}件は除く` : null,
      failed > 0 ? `${failed}件は追加できませんでした: ${reason}` : null,
    ].filter((note) => note !== null)
    const text = `全タレントの取得漏れチェックを${run.jobs.length}件キューに追加しました${
      notes.length > 0 ? `（${notes.join('、')}）` : ''
    }。`

    return failed > 0
      ? { error: text, success: false }
      : { message: text, success: true }
  } catch (error) {
    logger.error('全タレントの取得漏れチェックの依頼に失敗しました', {
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

/**
 * 全タレントの取得漏れチェックの対象数と、最新のチェックの進捗を返す。
 */
export async function getVideoBackfillRunAction(): Promise<
  VideoBackfillRunState | { error: string; success: false }
> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  try {
    return await readVideoBackfillRun(auth.supabaseClient)
  } catch (error) {
    logger.error('全タレントの取得漏れチェックの状況の取得に失敗しました', {
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
