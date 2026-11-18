import type { Tables } from "@shinju-date/database";
import {
  Button,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shinju-date/ui";
import { Megaphone } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Markdown } from "@/components/markdown";
import { TableSkeleton } from "@/components/table-skeleton";
import { formatDateTimeFromISO } from "@/lib/format";

import { deleteAnnouncementAction } from "../_actions";
import { AnnouncementModal } from "./announcement-modal";
import { LevelBadge, StatusBadge } from "./badges";

/** 削除の確認文に入れるため、本文を50文字までに切り詰める */
const truncateMessage = (message: string): string =>
  message.length > 50 ? `${message.substring(0, 50)}...` : message;

const AnnouncementRow = ({
  announcement,
}: {
  announcement: Tables<"announcements">;
}) => (
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
      })}{" "}
      〜 {formatDateTimeFromISO(announcement.end_at, { includeSeconds: false })}
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
);

export const AnnouncementsList = ({
  announcements,
}: {
  announcements: Tables<"announcements">[];
}) => {
  if (announcements.length === 0) {
    return (
      <EmptyState
        className="rounded-container border border-border bg-surface"
        description="新しいお知らせを追加してください。"
        icon={<Megaphone />}
        title="お知らせがありません。"
      />
    );
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
  );
};

/** 読み込み中の `AnnouncementsList`。4列の表を並べる */
export const AnnouncementsListSkeleton = () => (
  <TableSkeleton
    columns={[
      {
        cell: (
          <div className="w-full min-w-64 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ),
        className: "w-full",
        id: "message",
      },
      {
        cell: (
          <div className="flex gap-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        ),
        id: "status",
      },
      { cell: <Skeleton className="h-4 w-72" />, id: "period" },
      {
        align: "end",
        cell: (
          <div className="flex gap-4">
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-7 w-14" />
          </div>
        ),
        id: "actions",
      },
    ]}
    rows={4}
  />
);
