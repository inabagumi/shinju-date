import { Badge } from '@shinju-date/ui'
import { Temporal } from 'temporal-polyfill'
import type { Announcement } from '../_lib/types'

// Get level badge variant
function getLevelBadgeVariant(level: string): 'info' | 'warning' | 'error' {
  switch (level) {
    case 'warning':
      return 'warning'
    case 'alert':
      return 'error'
    default:
      return 'info'
  }
}

// Get level label
function getLevelLabel(level: string): string {
  switch (level) {
    case 'warning':
      return '警告'
    case 'alert':
      return '重要'
    default:
      return '情報'
  }
}

// Check if announcement is currently active
function isActive(announcement: Announcement): boolean {
  if (!announcement.enabled) return false

  const now = Temporal.Now.instant()
  const start = Temporal.Instant.from(announcement.start_at)
  const end = Temporal.Instant.from(announcement.end_at)

  return (
    Temporal.Instant.compare(now, start) >= 0 &&
    Temporal.Instant.compare(now, end) <= 0
  )
}

export function LevelBadge({ level }: { level: string }) {
  return (
    <Badge variant={getLevelBadgeVariant(level)}>{getLevelLabel(level)}</Badge>
  )
}

export function StatusBadge({ announcement }: { announcement: Announcement }) {
  return isActive(announcement) ? (
    <Badge variant="success">公開中</Badge>
  ) : announcement.enabled ? (
    <Badge variant="secondary">公開予定</Badge>
  ) : (
    <Badge variant="secondary">無効</Badge>
  )
}
