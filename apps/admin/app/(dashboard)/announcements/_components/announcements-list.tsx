import { TIME_ZONE } from '@shinju-date/constants'
import { formatDateTime } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import type { Announcement } from '../_lib/types'
import { AnnouncementModal } from './announcement-modal'
import { LevelBadge, StatusBadge } from './badges'
import { DeleteConfirmDialog } from './delete-confirm-dialog'

function AnnouncementItem({ announcement }: { announcement: Announcement }) {
  const startAt = Temporal.Instant.from(
    announcement.start_at,
  ).toZonedDateTimeISO(TIME_ZONE)
  const endAt = Temporal.Instant.from(announcement.end_at).toZonedDateTimeISO(
    TIME_ZONE,
  )

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Message */}
          <p className="text-slate-800">{announcement.message}</p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <LevelBadge level={announcement.level} />
            <StatusBadge announcement={announcement} />

            {/* Date range */}
            <span className="text-slate-600">
              {formatDateTime(startAt)} 〜 {formatDateTime(endAt)}
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
  )
}

export function AnnouncementsList({ announcements }: { announcements: Announcement[] }) {
  return (
    <div>
      {announcements.length === 0 ? (
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          お知らせがありません。新しいお知らせを追加してください。
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementItem
              announcement={announcement}
              key={announcement.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
