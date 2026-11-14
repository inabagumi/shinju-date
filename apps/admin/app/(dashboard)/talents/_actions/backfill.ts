'use server'

import { logger } from '@shinju-date/logger'
import {
  type BackfillJobStatus,
  type BackfillProvider,
  BackfillQueue,
  getBackfillJobId,
} from '@shinju-date/video-backfill'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'
import { getRedisClient } from '@/lib/redis'
import type { TypedSupabaseClient } from '@/lib/supabase'

const PROVIDER_LABELS: Record<BackfillProvider, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
}

/** Progress of the backfill of one account of a talent. */
export interface VideoBackfillAccount {
  /** Primary key of the account row (`youtube_channels` / `twitch_users`). */
  accountId: string
  /** Whether a job is queued or being read, so it cannot be requested again. */
  active: boolean
  /** Videos saved so far. */
  added: number
  error: string | null
  finishedAt: string | null
  name: string
  /** Pages read so far. */
  pages: number
  provider: BackfillProvider
  requestedAt: string | null
  /** `null` when the account was never backfilled (or it was long ago). */
  status: BackfillJobStatus | null
  updatedAt: string | null
}

interface TalentAccounts {
  accounts: Pick<VideoBackfillAccount, 'accountId' | 'name' | 'provider'>[]
  name: string
}

/**
 * Loads a talent that is not deleted, with its YouTube channels and Twitch
 * accounts.
 */
async function getTalentAccounts(
  supabaseClient: TypedSupabaseClient,
  talentId: string,
): Promise<TalentAccounts | null> {
  const { data, error } = await supabaseClient
    .from('talents')
    .select(
      'name, youtube_channels(id, name, youtube_channel_id), twitch_users(id, name, twitch_login_name, twitch_user_id)',
    )
    .eq('id', talentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    accounts: [
      ...data.youtube_channels.map((channel) => ({
        accountId: channel.id,
        name: channel.name ?? channel.youtube_channel_id,
        provider: 'youtube' as const,
      })),
      ...data.twitch_users.map((user) => ({
        accountId: user.id,
        name: user.name ?? user.twitch_login_name ?? user.twitch_user_id,
        provider: 'twitch' as const,
      })),
    ],
    name: data.name,
  }
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
 */
export async function requestVideoBackfillAction(
  talentId: string,
  provider: BackfillProvider,
): Promise<{
  success: boolean
  error?: string
  message?: string
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient, user } = auth

  if (provider !== 'youtube' && provider !== 'twitch') {
    return { error: '不明なプラットフォームです。', success: false }
  }

  const label = PROVIDER_LABELS[provider]

  try {
    const talent = await getTalentAccounts(supabaseClient, talentId)

    if (!talent) {
      return { error: 'タレントが見つかりませんでした。', success: false }
    }

    const accounts = talent.accounts.filter(
      (account) => account.provider === provider,
    )

    if (accounts.length === 0) {
      return {
        error: `このタレントに紐づく${label}アカウントはありません。`,
        success: false,
      }
    }

    const queue = new BackfillQueue(getRedisClient())
    const enqueued: typeof accounts = []

    for (const account of accounts) {
      const result = await queue.enqueue({
        accountId: account.accountId,
        provider,
        requestedBy: user.id,
        talentId,
      })

      if (result.enqueued) {
        enqueued.push(account)
      }
    }

    if (enqueued.length === 0) {
      return {
        error: `${label}の過去動画の取り込みは既に実行中です。`,
        success: false,
      }
    }

    await createAuditLog('VIDEO_BACKFILL', 'channels', talentId, {
      accounts: enqueued.map(({ accountId, name }) => ({ accountId, name })),
      entityName: talent.name,
      platform: provider,
    })

    const skipped = accounts.length - enqueued.length

    return {
      message:
        skipped > 0
          ? `${label}の過去動画の取り込みを${enqueued.length}件キューに追加しました（実行中の${skipped}件は除く）。`
          : `${label}の過去動画の取り込みをキューに追加しました。数分以内に開始されます。`,
      success: true,
    }
  } catch (error) {
    logger.error('過去動画の取り込みの依頼に失敗しました', {
      error,
      provider,
      talentId,
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
 * タレントの各アカウントの過去動画の取り込み状況を返す。
 */
export async function getVideoBackfillStatusAction(talentId: string): Promise<{
  success: boolean
  accounts?: VideoBackfillAccount[]
  error?: string
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  try {
    const talent = await getTalentAccounts(auth.supabaseClient, talentId)

    if (!talent) {
      return { error: 'タレントが見つかりませんでした。', success: false }
    }

    const queue = new BackfillQueue(getRedisClient())
    const states = await queue.getJobs(
      talent.accounts.map((account) =>
        getBackfillJobId(account.provider, account.accountId),
      ),
    )

    return {
      accounts: talent.accounts.map((account, index) => {
        const state = states[index]

        return {
          ...account,
          active: state?.active ?? false,
          added: state?.job.added ?? 0,
          error: state?.job.error ?? null,
          finishedAt: state?.job.finishedAt ?? null,
          pages: state?.job.pages ?? 0,
          requestedAt: state?.job.requestedAt ?? null,
          status: state?.job.status ?? null,
          updatedAt: state?.job.updatedAt ?? null,
        }
      }),
      success: true,
    }
  } catch (error) {
    logger.error('過去動画の取り込み状況の取得に失敗しました', {
      error,
      talentId,
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
