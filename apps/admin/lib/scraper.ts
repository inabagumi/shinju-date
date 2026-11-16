import type { Enums } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import type { Scraper } from '@shinju-date/scraper'
import { TwitchScraper } from '@shinju-date/scraper/twitch'
import { YouTubeScraper } from '@shinju-date/scraper/youtube'
import { supabaseClient } from '@/lib/supabase/admin'

/**
 * プラットフォームの Scraper を、管理画面のデータベースとロガーで作る。
 *
 * - Scraper は動画の行に加えてサムネイル（`thumbnails` と Storage）にも書き込むため、
 *   管理者用クライアント（service role）を使う。RLS で守られないので、
 *   呼び出し側で認証済みであることを確認しておくこと
 * - 1件の失敗で止めない処理（サムネイルの保存など）の失敗は、`logger` に記録される
 */
export function createScraper(platform: Enums<'platform_type'>): Scraper {
  const options = { logger, supabaseClient }

  return platform === 'twitch'
    ? new TwitchScraper(options)
    : new YouTubeScraper(options)
}
