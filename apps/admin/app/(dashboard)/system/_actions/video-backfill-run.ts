'use server'

import { logger } from '@shinju-date/logger'
import {
  type BackfillProvider,
  type BackfillRunJobStatus,
  BackfillRuns,
} from '@shinju-date/video-backfill'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'
import { getRedisClient } from '@/lib/redis'
import {
  type BackfillAccount,
  getBackfillAccounts,
} from '../_lib/backfill-accounts'

/** Progress of the backfill of one account in a check of all talents. */
export interface VideoBackfillRunAccount {
  accountId: string
  /** Whether the job is queued or being read. */
  active: boolean
  /** Videos saved since the check queued the job. */
  added: number
  error: string | null
  /** Account name, or `null` when the account no longer exists. */
  name: string | null
  provider: BackfillProvider
  status: BackfillRunJobStatus
  talentId: string
  /** Talent name, or `null` when the talent was deleted. */
  talentName: string | null
  updatedAt: string | null
}

/** The latest check of all talents for videos that are not saved. */
export interface VideoBackfillRun {
  accounts: VideoBackfillRunAccount[]
  /** Whether any account is queued or being read. */
  active: boolean
  /** Videos saved by the check, across all accounts. */
  added: number
  counts: Record<BackfillRunJobStatus, number>
  /** Accounts that could not be queued because of an error. */
  failed: number
  id: string
  requestedAt: string
  /** Accounts left out because they were being backfilled already. */
  skipped: number
}

/** Accounts of active talents, the targets of a check. */
export interface VideoBackfillTargets {
  twitch: number
  youtube: number
}

function countTargets(
  targets: readonly BackfillAccount[],
): VideoBackfillTargets {
  return {
    twitch: targets.filter((account) => account.provider === 'twitch').length,
    youtube: targets.filter((account) => account.provider === 'youtube').length,
  }
}

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

    await createAuditLog('VIDEO_BACKFILL', 'redis:video-backfill', run.id, {
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
export async function getVideoBackfillRunAction(): Promise<{
  success: boolean
  error?: string
  /** `null` when there was no check (or it was long ago). */
  run?: VideoBackfillRun | null
  targets?: VideoBackfillTargets
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  try {
    const [{ all, targets }, progress] = await Promise.all([
      getBackfillAccounts(auth.supabaseClient),
      new BackfillRuns(getRedisClient()).getLatest(),
    ])

    return {
      run: progress && {
        accounts: progress.jobs.map((job) => {
          const account = all.get(job.id)

          return {
            accountId: job.accountId,
            active: job.active,
            added: job.added,
            error: job.error,
            name: account?.name ?? null,
            provider: job.provider,
            status: job.status,
            talentId: job.talentId,
            talentName: account?.talentName ?? null,
            updatedAt: job.updatedAt,
          }
        }),
        active: progress.active,
        added: progress.added,
        counts: progress.counts,
        failed: progress.run.failed,
        id: progress.run.id,
        requestedAt: progress.run.requestedAt,
        skipped: progress.run.skipped,
      },
      success: true,
      targets: countTargets(targets),
    }
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
