import type { Announcement } from '@/lib/fetchers'

/**
 * `fetchActiveAnnouncements` の結果から、現在の時刻が開始と終了の間にある
 * 最初の1件（作成の新しい順に並んでいるので、いちばん新しいもの）を選ぶ。
 * 該当するものがなければ `null` を返す。
 */
export function selectCurrentAnnouncement(
  announcements: readonly Announcement[],
  now: Temporal.Instant,
): Announcement | null {
  return (
    announcements.find(
      (announcement) =>
        Temporal.Instant.compare(
          Temporal.Instant.from(announcement.start_at),
          now,
        ) <= 0 &&
        Temporal.Instant.compare(
          now,
          Temporal.Instant.from(announcement.end_at),
        ) <= 0,
    ) ?? null
  )
}
