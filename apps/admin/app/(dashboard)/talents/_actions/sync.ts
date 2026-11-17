'use server'

import { CACHE_TAGS } from '@shinju-date/constants'
import type { Enums, Tables } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit-log'
import {
  type AuthenticatedContext,
  requireAuthenticatedUser,
  unauthenticatedResult,
} from '@/lib/auth'
import { createScraper } from '@/lib/scraper'
import {
  accountsNotFoundError,
  type PlatformSyncOutcome,
  type SyncResult,
  toSyncResult,
  toSyncSummary,
} from '../_lib/sync-result'

type Platform = Enums<'platform_type'>

type Talent = Pick<Tables<'talents'>, 'id' | 'name'>

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '予期しないエラーが発生しました。'
}

/**
 * タレントの1つのプラットフォームのアカウントを、scraper の `syncTalentAccounts` で同期する。
 * 変更があれば、タレントの更新日時を進め、監査ログを残し、再検証する。
 * 例外は投げず、失敗は `failed` として返す。
 */
async function syncPlatform(
  { supabaseClient }: AuthenticatedContext,
  talent: Talent,
  platform: Platform,
): Promise<PlatformSyncOutcome> {
  try {
    const now = Temporal.Now.instant()
    const scraper = createScraper(platform)
    const results = await scraper.syncTalentAccounts(talent.id, now)

    if (results.length === 0) {
      return { status: 'no_accounts' }
    }

    // Twitch は名前を書き込めなくてもアイコンを同期するので、`failed` でもアイコンの変更は残す
    const changed = results.filter(
      (result) => result.status === 'updated' || result.iconUpdated,
    )

    if (changed.length === 0) {
      return results.some((result) => result.status === 'unchanged')
        ? { status: 'unchanged' }
        : { error: accountsNotFoundError(platform), status: 'failed' }
    }

    // 一覧の並びに反映するため、タレントの更新日時を進める
    const { error } = await supabaseClient
      .from('talents')
      .update({ updated_at: toDBString(now) })
      .eq('id', talent.id)

    if (error) {
      throw error
    }

    await createAuditLog('CHANNEL_SYNC', talent.id, {
      accounts: changed.map(({ accountId, changes, iconUpdated, name }) => ({
        id: accountId,
        name,
        ...(changes ? { changes } : {}),
        ...(iconUpdated ? { iconUpdated } : {}),
      })),
      entityName: talent.name,
      platform,
    })

    revalidatePath(`/talents/${talent.id}`)
    revalidatePath('/talents')
    await revalidateTags([CACHE_TAGS.TALENTS, CACHE_TAGS.VIDEOS])

    return { status: 'updated' }
  } catch (error) {
    logger.error('タレントの同期に失敗しました', {
      error,
      platform,
      talentId: talent.id,
    })

    return { error: toErrorMessage(error), status: 'failed' }
  }
}

/** 削除されていないタレントを読み、`run` で同期して結果を返す。例外は投げない。 */
async function syncTalent(
  { supabaseClient }: AuthenticatedContext,
  talentId: string,
  run: (talent: Talent) => Promise<SyncResult>,
): Promise<SyncResult> {
  try {
    const { data: talent, error } = await supabaseClient
      .from('talents')
      .select('id, name')
      .eq('id', talentId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      throw error
    }

    return talent
      ? await run(talent)
      : { error: 'タレントが見つかりませんでした。', success: false }
  } catch (error) {
    logger.error('タレントの同期に失敗しました', { error, talentId })

    return { error: toErrorMessage(error), success: false }
  }
}

/**
 * タレントに紐づく YouTube チャンネルを YouTube に合わせる（名前、ハンドル、アイコン）。
 *
 * 同期は `@shinju-date/scraper` の `syncTalentAccounts` が、定期の同期と同じ関数で行う
 * （変更があったアカウントだけを更新する）。タレント名（`talents.name`）は更新しない（#5622）。
 */
export async function syncTalentWithYouTube(
  talentId: string,
): Promise<SyncResult> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  return syncTalent(auth, talentId, async (talent) =>
    toSyncResult('youtube', await syncPlatform(auth, talent, 'youtube')),
  )
}

/**
 * タレントに紐づく Twitch ユーザーを Twitch に合わせる（表示名、login、アイコン）。
 * 同期の仕方は {@link syncTalentWithYouTube} と同じ。
 */
export async function syncTalentWithTwitch(
  talentId: string,
): Promise<SyncResult> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  return syncTalent(auth, talentId, async (talent) =>
    toSyncResult('twitch', await syncPlatform(auth, talent, 'twitch')),
  )
}

/**
 * タレントに紐づく YouTube チャンネルと Twitch ユーザーをまとめて同期する（タレント一覧の「同期」）。
 * プラットフォームごとに独立して同期するので、片方の失敗でもう片方を止めない。
 */
export async function syncTalentAccounts(
  talentId: string,
): Promise<SyncResult> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  return syncTalent(auth, talentId, async (talent) =>
    toSyncSummary(
      await Promise.all(
        (['youtube', 'twitch'] as const).map(
          async (platform) =>
            [platform, await syncPlatform(auth, talent, platform)] as const,
        ),
      ),
    ),
  )
}
