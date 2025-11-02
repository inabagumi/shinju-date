'use client'

import { TIME_ZONE } from '@shinju-date/constants'
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

// Format datetime for display
function formatDateTime(isoString: string): string {
  const instant = Temporal.Instant.from(isoString)
  const zonedDateTime = instant.toZonedDateTimeISO(TIME_ZONE)

  return zonedDateTime.toLocaleString('ja-JP', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Get level badge color
function getLevelBadgeClass(level: string): string {
  switch (level) {
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'alert':
      return 'bg-red-100 text-red-800 border-red-300'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300'
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
                    <span
                      className={`rounded-full border px-2 py-1 font-medium text-xs ${getLevelBadgeClass(announcement.level)}`}
                    >
                      {getLevelLabel(announcement.level)}
                    </span>

                    {/* Status badge */}
                    {isActive(announcement) ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 text-xs">
                        公開中
                      </span>
                    ) : announcement.enabled ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600 text-xs">
                        公開予定
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600 text-xs">
                        無効
                      </span>
                    )}

                    {/* Date range */}
                    <span className="text-slate-600">
                      {formatDateTime(announcement.start_at)} 〜{' '}
                      {formatDateTime(announcement.end_at)}
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
