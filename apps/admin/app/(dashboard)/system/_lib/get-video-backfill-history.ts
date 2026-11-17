import type { Enums } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import {
  type BackfillProvider,
  BackfillQueue,
  getBackfillJobId,
} from '@shinju-date/video-backfill'
import { cacheLife } from 'next/cache'
import { getRedisClient } from '@/lib/redis'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { type BackfillAccount, getBackfillAccounts } from './backfill-accounts'

/** Entries of the history shown at once. */
const HISTORY_LIMIT = 50

export type VideoBackfillHistoryStatus = Enums<'video_backfill_job_status'>

/** A backfill job that finished, as recorded by the batch app. */
export interface VideoBackfillHistoryEntry {
  accountId: string
  /** Videos the job saved. */
  added: number
  error: string | null
  finishedAt: string
  id: string
  /** Account name, or `null` when the account no longer exists. */
  name: string | null
  pages: number
  provider: BackfillProvider
  requestedAt: string
  /**
   * Email of the admin user who requested the job, or `null` when it is not
   * known (e.g. the user was deleted).
   */
  requester: string | null
  /**
   * `all` when the job belonged to a check of all talents; `single` when it
   * was requested on its own (from the talent page, or by retrying failed
   * jobs).
   */
  scope: 'all' | 'single'
  status: VideoBackfillHistoryStatus
  talentId: string
  /** Talent name, or `null` when it could not be loaded. */
  talentName: string | null
}

/** An account whose latest backfill job failed. */
export interface VideoBackfillFailure {
  accountId: string
  /**
   * Whether a job for the account is queued or being read again, so that it
   * cannot be requested again until it finishes.
   */
  active: boolean
  error: string | null
  finishedAt: string
  name: string
  provider: BackfillProvider
  talentId: string
  talentName: string
}

/** The backfills that finished, and the accounts whose latest one failed. */
export interface VideoBackfillHistory {
  entries: VideoBackfillHistoryEntry[]
  failures: VideoBackfillFailure[]
  success: true
}

interface LatestFailure {
  accountId: string
  error: string | null
  finishedAt: string
  provider: BackfillProvider
}

/**
 * Loads the accounts whose latest backfill job failed, newest first. Accounts
 * that were deleted, or whose talent was deleted, are left out by the view.
 */
export async function getLatestFailures(
  supabaseClient: TypedSupabaseClient,
): Promise<LatestFailure[]> {
  const { data, error } = await supabaseClient
    .from('video_backfill_latest_jobs')
    .select('account_id, platform, error, finished_at')
    .eq('status', 'failed')
    .order('finished_at', { ascending: false })

  if (error) {
    throw error
  }

  return data.map((row) => ({
    accountId: row.account_id,
    error: row.error,
    finishedAt: row.finished_at,
    provider: row.platform,
  }))
}

/**
 * Pairs the latest failures with the accounts they belong to, dropping the
 * ones whose account cannot be found.
 */
export function toFailedAccounts(
  failures: readonly LatestFailure[],
  accounts: ReadonlyMap<string, BackfillAccount>,
): (LatestFailure & BackfillAccount)[] {
  return failures.flatMap((failure) => {
    const account = accounts.get(
      getBackfillJobId(failure.provider, failure.accountId),
    )

    return account ? [{ ...failure, ...account }] : []
  })
}

/**
 * Looks up the emails of the admin users who requested jobs. A user that
 * cannot be looked up is left out, so the history still loads.
 */
async function getRequesterEmails(
  ids: readonly string[],
): Promise<Map<string, string>> {
  const emails = new Map<string, string>()

  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      try {
        const { data, error } =
          await getSupabaseAdminClient().auth.admin.getUserById(id)

        if (!error && data.user?.email) {
          emails.set(id, data.user.email)
        }
      } catch (error) {
        logger.warn('過去動画の取り込みの依頼者を取得できませんでした', {
          error,
          userId: id,
        })
      }
    }),
  )

  return emails
}

/**
 * 終了した過去動画の取り込み（バックフィル）の履歴と、最後の取り込みが失敗したアカウントを返す。
 *
 * ## 仕様
 * - 履歴は Supabase の `video_backfill_jobs`（バッチが終了時に記録）から新しい順に返す
 * - 失敗は `video_backfill_latest_jobs` で最後の取り込みが失敗したアカウント。削除されたアカウント・タレントは除く
 * - 失敗したアカウントのうち、再依頼されて待機中・処理中のものは `active` にする（Redis を読めないときは `false`）
 *
 * 再試行中かどうかの判定に今の時刻（`Temporal.Now`）を使うので、Server Component
 * からはキャッシュする `getVideoBackfillHistory` を通して呼ぶ
 */
export async function readVideoBackfillHistory(
  supabaseClient: TypedSupabaseClient,
): Promise<VideoBackfillHistory> {
  const [history, latestFailures, { all }] = await Promise.all([
    supabaseClient
      .from('video_backfill_jobs')
      .select(
        'id, platform, account_id, talent_id, run_id, requested_by, status, added, pages, error, requested_at, finished_at, talents(name)',
      )
      .order('finished_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    getLatestFailures(supabaseClient),
    getBackfillAccounts(supabaseClient),
  ])

  if (history.error) {
    throw history.error
  }

  const failedAccounts = toFailedAccounts(latestFailures, all)
  const [emails, states] = await Promise.all([
    getRequesterEmails(
      history.data.flatMap((row) =>
        row.requested_by ? [row.requested_by] : [],
      ),
    ),
    new BackfillQueue(getRedisClient())
      .getJobs(
        failedAccounts.map((account) =>
          getBackfillJobId(account.provider, account.accountId),
        ),
      )
      .catch((error: unknown) => {
        logger.warn('過去動画の取り込みの状況を取得できませんでした', {
          error,
        })

        return []
      }),
  ])

  return {
    entries: history.data.map((row) => ({
      accountId: row.account_id,
      added: row.added,
      error: row.error,
      finishedAt: row.finished_at,
      id: row.id,
      name:
        all.get(getBackfillJobId(row.platform, row.account_id))?.name ?? null,
      pages: row.pages,
      provider: row.platform,
      requestedAt: row.requested_at,
      requester: row.requested_by
        ? (emails.get(row.requested_by) ?? null)
        : null,
      scope: row.run_id ? 'all' : 'single',
      status: row.status,
      talentId: row.talent_id,
      talentName: row.talents?.name ?? null,
    })),
    failures: failedAccounts.map((account, index) => ({
      accountId: account.accountId,
      active: states[index]?.active ?? false,
      error: account.error,
      finishedAt: account.finishedAt,
      name: account.name,
      provider: account.provider,
      talentId: account.talentId,
      talentName: account.talentName,
    })),
    success: true,
  }
}

/**
 * 終了した過去動画の取り込みの履歴と、最後の取り込みが失敗したアカウントを返す。
 * 再試行の状況は刻々と変わるので、`seconds` でキャッシュする
 */
export async function getVideoBackfillHistory(): Promise<VideoBackfillHistory> {
  'use cache: private'

  cacheLife('seconds')

  const supabaseClient = await createSupabaseServerClient()

  return readVideoBackfillHistory(supabaseClient)
}
