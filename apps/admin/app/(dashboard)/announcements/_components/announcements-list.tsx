'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { formatDateTime } from '@shinju-date/temporal-fns'
import { Badge, type BadgeVariant } from '@shinju-date/ui'
import { Temporal } from 'temporal-polyfill'
import { AnnouncementModal } from './announcement-modal'
import { DeleteConfirmDialog } from './delete-confirm-dialog'

type Announcement = {
  id: string
  message: string
  level: string
  enabled: boolean
  start_at: string
  end_at: string
  created_at: string | null
  updated_at: string | null
}

type AnnouncementsListProps = {
  announcements: Announcement[]
}

// Get level badge variant
function getLevelBadgeVariant(level: string): BadgeVariant {
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

export function AnnouncementsList({ announcements }: AnnouncementsListProps) {
  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-3xl">お知らせ管理</h1>
        <AnnouncementModal />
      </div>

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          お知らせがありません。新しいお知らせを追加してください。
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm"
              key={announcement.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Message */}
                  <p className="text-slate-800">{announcement.message}</p>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {/* Level badge */}
                    <Badge variant={getLevelBadgeVariant(announcement.level)}>
                      {getLevelLabel(announcement.level)}
                    </Badge>

                    {/* Status badge */}
                    {isActive(announcement) ? (
                      <Badge variant="success">公開中</Badge>
                    ) : announcement.enabled ? (
                      <Badge variant="secondary">公開予定</Badge>
                    ) : (
                      <Badge variant="secondary">無効</Badge>
                    )}

                    {/* Date range */}
                    <span className="text-slate-600">
                      {formatDateTime(
                        Temporal.Instant.from(
                          announcement.start_at,
                        ).toZonedDateTimeISO(TIME_ZONE),
                      )}{' '}
                      〜{' '}
                      {formatDateTime(
                        Temporal.Instant.from(
                          announcement.end_at,
                        ).toZonedDateTimeISO(TIME_ZONE),
                      )}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <AnnouncementModal announcement={announcement} />
                  <DeleteConfirmDialog
                    announcementId={announcement.id}
                    announcementMessage={announcement.message}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
