'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { useNow } from './timer'

function subscribeNothing() {
  return () => {}
}

/**
 * 「今日」を判定する基準の日付。
 * サーバーでの描画とハイドレーションでは、データと一緒に取得した `referenceDate` を使い、
 * 両者の文言を揃える。ハイドレーションの後はブラウザの現在時刻に切り替えるため、
 * キャッシュを作った後に日付が変わっていても正しい文言になる。
 */
export function useToday(referenceDate: string): Temporal.PlainDate {
  const now = useNow()
  const isHydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )

  return useMemo(
    () =>
      isHydrated ? now.toPlainDate() : Temporal.PlainDate.from(referenceDate),
    [isHydrated, now, referenceDate],
  )
}
