import { logger } from '@shinju-date/logger'
import {
  type ProfileImageSyncResult,
  type SavedYouTubeChannelIcon,
  type SyncYouTubeChannelIconOptions,
  syncYouTubeChannelIcon,
} from '@shinju-date/scraper/youtube'
import { supabaseClient } from '@/lib/supabase/admin'

/**
 * YouTube チャンネルのアイコンを YouTube に合わせて保存・差し替える。
 *
 * - アイコン（`profile_images` と Storage）は service role でしか書き込めないため、
 *   管理者用クライアントを使う。呼び出し側で認証済みであることを確認しておくこと
 * - アイコンの同期に失敗しても、チャンネル名などの同期や登録は止めない。
 *   失敗は例外を投げずにログへ記録し、`null` を返す
 *
 * @returns 同期結果。失敗した場合は `null`
 */
export async function syncYouTubeChannelIconSafely(
  channel: SyncYouTubeChannelIconOptions['channel'],
  saved: SavedYouTubeChannelIcon,
): Promise<ProfileImageSyncResult | null> {
  try {
    return await syncYouTubeChannelIcon({ channel, saved, supabaseClient })
  } catch (error) {
    // エラーオブジェクトをそのまま渡さず、名前とメッセージだけを記録する
    logger.warn('YouTubeチャンネルのアイコンを同期できませんでした', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      youtubeChannelId: saved.youtube_channel_id,
    })

    return null
  }
}

/** アイコンに変更があったかどうか（失敗・変更なしは `false`） */
export function hasProfileImageChanged(
  result: ProfileImageSyncResult | null,
): result is Exclude<ProfileImageSyncResult, 'unchanged'> {
  return result !== null && result !== 'unchanged'
}
