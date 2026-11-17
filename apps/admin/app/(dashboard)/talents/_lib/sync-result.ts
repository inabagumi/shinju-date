import type { Enums } from '@shinju-date/database'

type Platform = Enums<'platform_type'>

/** タレントの同期のアクションの戻り値 */
export interface SyncResult {
  success: boolean
  error?: string
  message?: string
  unchanged?: boolean
}

/** 1つのプラットフォームの同期の結果（`no_accounts`: そのプラットフォームのアカウントがない） */
export type PlatformSyncOutcome =
  | { status: 'no_accounts' | 'unchanged' | 'updated' }
  | { error: string; status: 'failed' }

const PLATFORMS = {
  twitch: {
    account: 'ユーザー',
    label: 'Twitch',
    /** 1つのプラットフォームだけを同期したときの「変更なし」 */
    unchanged: 'Twitchユーザー情報は既に最新です。',
  },
  youtube: {
    account: 'チャンネル',
    label: 'YouTube',
    unchanged: 'チャンネル情報は既に最新です。',
  },
} as const satisfies Record<Platform, Record<string, string>>

/** どのアカウントも、プラットフォームで見つからなかった（同期できなかった）ときの文 */
export function accountsNotFoundError(platform: Platform): string {
  const { account, label } = PLATFORMS[platform]

  return `${label}で${account}が見つかりませんでした。${account}IDが正しいか確認してください。`
}

/** 1つのプラットフォームだけを同期したときの結果を、画面の文にする。 */
export function toSyncResult(
  platform: Platform,
  outcome: PlatformSyncOutcome,
): SyncResult {
  const { account, label, unchanged } = PLATFORMS[platform]

  switch (outcome.status) {
    case 'no_accounts':
      return {
        error: `このタレントに紐づく${label}${account}はありません。`,
        success: false,
      }
    case 'failed':
      return { error: outcome.error, success: false }
    case 'unchanged':
      return { message: unchanged, success: true, unchanged: true }
    case 'updated':
      return { success: true }
  }
}

/**
 * まとめて同期したときの結果を、プラットフォームごとに1行の文にする。
 *
 * - アカウントのないプラットフォームは書かない
 * - どれかが失敗したら `success: false` とし、`error` に同じ文を入れる
 * - `unchanged` は、どのプラットフォームも更新されなかったときに `true`
 */
export function toSyncSummary(
  outcomes: readonly (readonly [Platform, PlatformSyncOutcome])[],
): SyncResult {
  const lines = outcomes.flatMap(([platform, outcome]) => {
    const { account, label } = PLATFORMS[platform]

    if (outcome.status === 'no_accounts') {
      return []
    }

    const text =
      outcome.status === 'failed'
        ? `同期に失敗しました。${outcome.error}`
        : outcome.status === 'unchanged'
          ? `${account}情報は既に最新です。`
          : `${account}情報を同期しました。`

    return [`${label}: ${text}`]
  })

  if (lines.length === 0) {
    return {
      error:
        'このタレントに紐づくYouTubeチャンネル・Twitchユーザーはありません。',
      success: false,
    }
  }

  const text = lines.join('\n')
  const unchanged = outcomes.every(([, { status }]) => status !== 'updated')

  return outcomes.some(([, { status }]) => status === 'failed')
    ? { error: text, success: false, unchanged }
    : { message: text, success: true, unchanged }
}
