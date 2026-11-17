import type { Tables } from '@shinju-date/database'
import { range } from '@shinju-date/helpers'
import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import {
  Button,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import { Megaphone } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Markdown } from '@/components/markdown'
import { deleteAnnouncementAction } from '../_actions'
import { AnnouncementModal } from './announcement-modal'
import { LevelBadge, StatusBadge } from './badges'

/** 削除の確認文に入れるため、本文を50文字までに切り詰める */
function truncateMessage(message: string): string {
  return message.length > 50 ? `${message.substring(0, 50)}...` : message
}

function AnnouncementRow({
  announcement,
}: {
  announcement: Tables<'announcements'>
}) {
  return (
    <TableRow>
      <TableCell className="min-w-64 whitespace-normal">
        <Markdown size="sm">{announcement.message}</Markdown>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <LevelBadge level={announcement.level} />
          <StatusBadge announcement={announcement} />
        </div>
      </TableCell>
      <TableCell className="text-muted tabular-nums">
        {formatDateTimeFromISO(announcement.start_at, {
          includeSeconds: false,
        })}{' '}
        〜{' '}
        {formatDateTimeFromISO(announcement.end_at, { includeSeconds: false })}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-4">
          <AnnouncementModal announcement={announcement} />
          <ConfirmDialog
            confirmLabel="削除"
            confirmVariant="danger"
            description={`本当に「${truncateMessage(announcement.message)}」を削除しますか？この操作は取り消せません。`}
            onConfirm={deleteAnnouncementAction.bind(null, announcement.id)}
            title="お知らせを削除"
            trigger={
              <Button size="sm" variant="danger">
                削除
              </Button>
            }
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

export function AnnouncementsList({
  announcements,
}: {
  announcements: Tables<'announcements'>[]
}) {
  if (announcements.length === 0) {
    return (
      <EmptyState
        className="rounded-container border border-border bg-surface"
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
