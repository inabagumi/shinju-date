import { logger } from '@shinju-date/logger'
import {
  type ProfileImageSyncResult,
  type SavedTwitchUserIcon,
  type SyncTwitchUserIconOptions,
  syncTwitchUserIcon,
} from '@shinju-date/scraper/twitch'
import { supabaseClient } from '@/lib/supabase/admin'

/**
 * Twitch ユーザーのアイコンを Twitch に合わせて保存・差し替える。
 *
 * - アイコン（`profile_images` と Storage）は service role でしか書き込めないため、
 *   管理者用クライアントを使う。呼び出し側で認証済みであることを確認しておくこと
 * - アイコンの同期に失敗しても、表示名などの同期や登録は止めない。
 *   失敗は例外を投げずにログへ記録し、`null` を返す
 *
 * @returns 同期結果。失敗した場合は `null`
 */
export async function syncTwitchUserIconSafely(
  user: SyncTwitchUserIconOptions['user'],
  saved: SavedTwitchUserIcon,
): Promise<ProfileImageSyncResult | null> {
  try {
    return await syncTwitchUserIcon({ saved, supabaseClient, user })
  } catch (error) {
    // エラーオブジェクトをそのまま渡さず、名前とメッセージだけを記録する
    logger.warn('Twitchユーザーのアイコンを同期できませんでした', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      twitchUserId: saved.twitch_user_id,
    })

    return null
  }
}
