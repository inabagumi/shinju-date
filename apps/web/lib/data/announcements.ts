'use server'

import { CACHE_TAGS } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { cacheLife, cacheTag } from 'next/cache'
import { unwrap } from '@/lib/data/unwrap'
import { supabaseClient } from '@/lib/supabase'

/** お知らせのバナーに表示するのに使う列 */
export type Announcement = Pick<
  Tables<'announcements'>,
  'end_at' | 'id' | 'level' | 'message' | 'start_at'
>

/**
 * 有効で、終了が現在より後のお知らせを、作成の新しい順に10件まで取得する。
 * 開始前のお知らせも含むので、表示するものは呼ぶ側で現在の時刻から選ぶ
 * （`selectCurrentAnnouncement`）。こうすると、キャッシュしている間に開始の
 * 時刻が来たお知らせも、取得し直さずに表示できる。
 */
export const fetchActiveAnnouncements = async (): Promise<Announcement[]> => {
  'use cache: remote'

  cacheLife('minutes')
  cacheTag(CACHE_TAGS.ANNOUNCEMENTS)

  const now = Temporal.Now.instant()

  return unwrap(
    await supabaseClient
      .from('announcements')
      .select('id, message, level, start_at, end_at')
      .eq('enabled', true)
      .gt('end_at', toDBString(now))
      .order('created_at', {
        ascending: false,
      })
      .limit(10),
    'fetchActiveAnnouncements',
  )
}
