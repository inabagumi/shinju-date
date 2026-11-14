import { TIME_ZONE } from '@shinju-date/constants'
import { range } from '@shinju-date/helpers'
import { formatDateTime } from '@shinju-date/temporal-fns'
import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import { Megaphone } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import type { Announcement } from '../_lib/types'
import { AnnouncementModal } from './announcement-modal'
import { LevelBadge, StatusBadge } from './badges'
import { DeleteConfirmDialog } from './delete-confirm-dialog'

/**
 * Markdown の本文。`prose` の色を両モードのセマンティックカラーに合わせる。
 */
const proseClassName =
  'prose prose-sm max-w-text text-foreground [--tw-prose-body:var(--color-foreground)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-bullets:var(--text-color-muted)] [--tw-prose-code:var(--color-foreground)] [--tw-prose-counters:var(--text-color-muted)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-links:var(--color-accent)]'

function AnnouncementRow({ announcement }: { announcement: Announcement }) {
  const startAt = Temporal.Instant.from(
    announcement.start_at,
  ).toZonedDateTimeISO(TIME_ZONE)
  const endAt = Temporal.Instant.from(announcement.end_at).toZonedDateTimeISO(
    TIME_ZONE,
  )

  return (
    <TableRow>
      <TableCell className="min-w-64 whitespace-normal">
        <div className={proseClassName}>
          <ReactMarkdown
            rehypePlugins={[
              [
                rehypeExternalLinks,
                {
                  rel: ['nofollow', 'noopener', 'noreferrer'],
                  target: '_blank',
                },
              ],
            ]}
            remarkPlugins={[remarkGfm]}
          >
            {announcement.message}
          </ReactMarkdown>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <LevelBadge level={announcement.level} />
          <StatusBadge announcement={announcement} />
        </div>
      </TableCell>
      <TableCell className="text-muted tabular-nums">
        {formatDateTime(startAt)} 〜 {formatDateTime(endAt)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-4">
          <AnnouncementModal announcement={announcement} />
          <DeleteConfirmDialog
            announcementId={announcement.id}
            announcementMessage={announcement.message}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

export function AnnouncementsList({
  announcements,
}: {
  announcements: Announcement[]
}) {
  if (announcements.length === 0) {
    return (
      <EmptyState
        className="rounded-container border border-border"
        description="新しいお知らせを追加してください。"
        icon={<Megaphone />}
        title="お知らせがありません。"
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>メッセージ</TableHead>
          <TableHead>状態</TableHead>
          <TableHead>表示期間</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {announcements.map((announcement) => (
          <AnnouncementRow announcement={announcement} key={announcement.id} />
        ))}
      </TableBody>
    </Table>
  )
}

export function AnnouncementsListSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse overflow-hidden rounded-container border border-border"
    >
      <div className="h-10 bg-muted" />
      {range(4).map((row) => (
        <div
          className="flex h-16 items-center gap-4 border-t border-border px-4"
          key={`announcement-row-skeleton-${row}`}
        >
          <div className="h-4 flex-1 rounded-control bg-muted" />
          <div className="h-5 w-24 rounded-control bg-muted" />
          <div className="h-4 w-48 rounded-control bg-muted" />
          <div className="h-8 w-28 rounded-control bg-muted" />
        </div>
      ))}
    </div>
  )
}
