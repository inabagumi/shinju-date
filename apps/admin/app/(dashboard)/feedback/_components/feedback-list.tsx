import type { Tables } from "@shinju-date/database";
import {
  Badge,
  EmptyState,
  FilterBar,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shinju-date/ui";
import { Inbox } from "lucide-react";
import Link from "next/link";

import { SearchParamSelect } from "@/components/search-param-select";
import {
  FieldSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/table-skeleton";
import { formatDateTimeFromISO } from "@/lib/format";

import {
  FEATURE_REQUEST_STATUS_LABELS,
  FEATURE_REQUEST_STATUSES,
} from "../_lib/feature-request-status";
import type { FeatureRequestStatus } from "../_lib/feature-request-status";
import type { FeedbackSearchParams } from "../_lib/search-params-schema";

interface FeatureRequestListProps {
  /** 絞り込みを済ませた機能要望 */
  featureRequests: Tables<"feature_requests">[];
  /** URL の `read`。`undefined` はすべて */
  readFilter: FeedbackSearchParams["read"];
  /** URL の `status`。`undefined` はすべて */
  statusFilter: FeedbackSearchParams["status"];
}

/** 「すべて」の選択肢の値。URL にはパラメータを付けない */
const ALL = "all";

const statusColors: Record<
  FeatureRequestStatus,
  "info" | "neutral" | "success" | "danger"
> = {
  in_progress: "neutral",
  pending: "info",
  rejected: "danger",
  resolved: "success",
};

/**
 * 機能要望の一覧。表と行はサーバーで描き、絞り込みのセレクトだけをクライアントの
 * 部品に任せる
 */
export const FeatureRequestList = ({
  featureRequests,
  readFilter,
  statusFilter,
}: FeatureRequestListProps) => {
  const activeCount =
    (statusFilter === undefined ? 0 : 1) + (readFilter === undefined ? 0 : 1);

  return (
    <div className="space-y-4">
      <FilterBar activeCount={activeCount}>
        <div className="flex flex-col gap-1 md:w-48">
          <label className="text-meta font-semibold" htmlFor="status-filter">
            ステータス
          </label>
          <SearchParamSelect
            defaultValue={ALL}
            id="status-filter"
            paramName="status"
            value={statusFilter ?? ALL}
          >
            <option value={ALL}>すべて</option>
            {FEATURE_REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {FEATURE_REQUEST_STATUS_LABELS[status]}
              </option>
            ))}
          </SearchParamSelect>
        </div>
        <div className="flex flex-col gap-1 md:w-48">
          <label className="text-meta font-semibold" htmlFor="read-filter">
            既読状態
          </label>
          <SearchParamSelect
            defaultValue={ALL}
            id="read-filter"
            paramName="read"
            value={readFilter ?? ALL}
          >
            <option value={ALL}>すべて</option>
            <option value="unread">未読</option>
            <option value="read">既読</option>
          </SearchParamSelect>
        </div>
      </FilterBar>

      {featureRequests.length === 0 ? (
        <EmptyState
          className="rounded-container border border-border bg-surface"
          icon={<Inbox />}
          title="機能要望がありません"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>状態</TableHead>
              <TableHead>内容</TableHead>
              <TableHead className="text-right">送信日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {featureRequests.map((item) => {
              const formattedDate = formatDateTimeFromISO(item.created_at, {
                includeSeconds: false,
              });

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusColors[item.status]}>
                        {FEATURE_REQUEST_STATUS_LABELS[item.status]}
                      </Badge>
                      {!item.is_read && <Badge variant="warning">未読</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-64 whitespace-normal">
                    <Link
                      className={`line-clamp-2 max-w-text rounded-control focus-ring hover:text-accent hover:underline ${
                        item.is_read ? "" : "font-semibold"
                      }`}
                      href={`/feedback/${item.id}`}
                    >
                      {item.message}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-muted tabular-nums">
                    {formattedDate}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

/** 読み込み中の `FeatureRequestList`。2つの絞り込みと、3列の表を並べる */
export const FeatureRequestListSkeleton = () => (
  <TableSkeleton
    columns={[
      { cell: <Skeleton className="h-5 w-16" />, id: "status" },
      {
        cell: (
          <div className="w-full max-w-text min-w-64 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ),
        className: "w-full",
        id: "message",
      },
      { align: "end", cell: <Skeleton className="h-4 w-32" />, id: "date" },
    ]}
    filterBar={
      <FilterBarSkeleton className="mb-4">
        <FieldSkeleton className="md:w-48" />
        <FieldSkeleton className="md:w-48" />
      </FilterBarSkeleton>
    }
  />
);
