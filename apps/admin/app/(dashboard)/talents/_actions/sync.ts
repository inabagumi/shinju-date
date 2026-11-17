'use server'

import { CACHE_TAGS } from '@shinju-date/constants'
import type { Enums, Tables } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { ActionError, adminAction } from '@/lib/action'
import { createAuditLog } from '@/lib/audit-log'
import type { AuthenticatedContext } from '@/lib/auth'
import { createScraper } from '@/lib/scraper'
import { touchTalent } from '@/lib/talent-accounts'
import {
  accountsNotFoundError,
  type PlatformSyncOutcome,
  type SyncResult,
  toSyncResult,
  toSyncSummary,
} from '../_lib/sync-result'

type Platform = Enums<'platform_type'>

type Talent = Pick<Tables<'talents'>, 'id' | 'name'>

/**
 * タレントの1つのプラットフォームのアカウントを、scraper の `syncTalentAccounts` で同期する。
 * 変更があれば、タレントの更新日時を進め、監査ログを残し、再検証する。
 * 例外は投げず、失敗は `failed` として返す（まとめて同期するとき、片方の失敗でもう片方を止めない）。
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
    const touchError = await touchTalent(supabaseClient, talent.id, now)

    if (touchError) {
      throw touchError
    }

    await createAuditLog(supabaseClient, 'CHANNEL_SYNC', talent.id, {
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

    return { status: 'failed' }
  }
}

/** 削除されていないタレントを読み、`run` で同期して結果を返す。 */
async function syncTalent(
  { supabaseClient }: AuthenticatedContext,
  talentId: string,
  run: (talent: Talent) => Promise<SyncResult>,
): Promise<SyncResult> {
  const { data: talent, error } = await supabaseClient
    .from('talents')
    .select('id, name')
    .eq('id', talentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!talent) {
    throw new ActionError('タレントが見つかりませんでした。')
  }

  return run(talent)
}

/**
 * タレントに紐づく YouTube チャンネルを YouTube に合わせる（名前、ハンドル、アイコン）。
 *
 * 同期は `@shinju-date/scraper` の `syncTalentAccounts` が、定期の同期と同じ関数で行う
 * （変更があったアカウントだけを更新する）。タレント名（`talents.name`）は更新しない（#5622）。
 */
export const syncTalentWithYouTubeAction = adminAction(
  'syncTalentWithYouTubeAction',
  (context, talentId: string) =>
    syncTalent(context, talentId, async (talent) =>
      toSyncResult('youtube', await syncPlatform(context, talent, 'youtube')),
    ),
)

/**
 * タレントに紐づく Twitch ユーザーを Twitch に合わせる（表示名、login、アイコン）。
 * 同期の仕方は {@link syncTalentWithYouTubeAction} と同じ。
 */
export const syncTalentWithTwitchAction = adminAction(
  'syncTalentWithTwitchAction',
  (context, talentId: string) =>
    syncTalent(context, talentId, async (talent) =>
      toSyncResult('twitch', await syncPlatform(context, talent, 'twitch')),
    ),
)

/**
 * タレントに紐づく YouTube チャンネルと Twitch ユーザーをまとめて同期する（タレント一覧の「同期」）。
 * プラットフォームごとに独立して同期するので、片方の失敗でもう片方を止めない。
 * 一部のプラットフォームだけが失敗したときは、成功として返し、失敗を `warnings` に入れる。
 */
export const syncTalentAccountsAction = adminAction(
  'syncTalentAccountsAction',
  (context, talentId: string) =>
    syncTalent(context, talentId, async (talent) =>
      toSyncSummary(
        await Promise.all(
          (['youtube', 'twitch'] as const).map(
            async (platform) =>
              [
                platform,
                await syncPlatform(context, talent, platform),
              ] as const,
          ),
        ),
      ),
    ),
)
