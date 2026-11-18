import {
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
import { ArrowDown, ArrowUp, Users } from "lucide-react";
import Link from "next/link";

import { SearchInput } from "@/components/search-input";
import { SearchParamSelect } from "@/components/search-param-select";
import { FilterBarSkeleton, TableSkeleton } from "@/components/table-skeleton";
import { formatDateTimeFromISO } from "@/lib/format";
import { buildSearchParamsHref } from "@/lib/search-params-href";

import type { TalentListItem } from "../_lib/get-talents";
import { DEFAULT_TALENT_LIST_FILTERS } from "../_lib/talent-list-filters";
import type {
  TalentSortOrder,
  TalentStatusFilter,
} from "../_lib/talent-list-filters";
import { TalentActions } from "./talent-actions";
import { TalentModal } from "./talent-modal";
import { TalentStatusBadge } from "./talent-status-badge";

interface TalentsListProps {
  /** URL の `search`。前後の空白を取り除いたもの */
  search: string | undefined;
  /** 今のページの URL のパラメータ。並べ替えのリンクで絞り込みを引き継ぐ */
  searchParams: URLSearchParams | string;
  /** URL の `sort` */
  sortOrder: TalentSortOrder;
  /** URL の `status` */
  statusFilter: TalentStatusFilter;
  /** 絞り込みと並べ替えを済ませたタレント */
  talents: TalentListItem[];
}

const FILTER_OPTIONS: { value: TalentStatusFilter; label: string }[] = [
  { label: "削除済み以外", value: "not_deleted" },
  { label: "アクティブ", value: "active" },
  { label: "引退", value: "retired" },
  { label: "削除済み", value: "deleted" },
  { label: "すべて", value: "all" },
];

/**
 * 最終更新日時の並べ替えのリンク先。向きを反対にし、ほかのパラメータ（絞り込み）は
 * 引き継ぐ。既定の向きのときは、パラメータを付けない
 */
const getSortHref = (
  searchParams: URLSearchParams | string,
  sortOrder: TalentSortOrder
): string => {
  const nextOrder = sortOrder === "desc" ? "asc" : "desc";

  return buildSearchParamsHref("/talents", searchParams, {
    sort: nextOrder === DEFAULT_TALENT_LIST_FILTERS.sort ? null : nextOrder,
  });
};

/**
 * タレントの一覧。表と行はサーバーで描き、検索ボックス、状態のセレクト、追加の
 * モーダル、行ごとの操作のメニューだけをクライアントの部品に任せる
 */
export const TalentsList = ({
  search,
  searchParams,
  sortOrder,
  statusFilter,
  talents,
}: TalentsListProps) => {
  const isStatusFiltered = statusFilter !== DEFAULT_TALENT_LIST_FILTERS.status;
  const isFiltered = search !== undefined || isStatusFiltered;
  const activeFilterCount =
    (search === undefined ? 0 : 1) + (isStatusFiltered ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <FilterBar activeCount={activeFilterCount} className="min-w-0 grow">
          <SearchInput
            aria-label="タレント名またはIDで検索"
            className="md:max-w-sm"
            placeholder="タレント名またはIDで検索..."
          />
          <SearchParamSelect
            aria-label="状態で絞り込み"
            className="md:w-48"
            defaultValue={DEFAULT_TALENT_LIST_FILTERS.status}
            paramName="status"
            value={statusFilter}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SearchParamSelect>
        </FilterBar>
        <TalentModal />
      </div>

      {talents.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={isFiltered ? "検索結果がありません。" : "タレントがいません。"}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>タレント名</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>作成日時</TableHead>
              <TableHead
                aria-sort={sortOrder === "desc" ? "descending" : "ascending"}
              >
                <Link
                  className="inline-flex items-center gap-1 rounded-control focus-ring hover:text-foreground"
                  href={getSortHref(searchParams, sortOrder)}
                  replace
                >
                  最終更新日時
                  {sortOrder === "desc" ? (
                    <ArrowDown aria-hidden="true" className="size-3" />
                  ) : (
                    <ArrowUp aria-hidden="true" className="size-3" />
                  )}
                </Link>
              </TableHead>
              <TableHead className="text-right">
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {talents.map((talent) => (
              <TableRow key={talent.id}>
                <TableCell className="min-w-48 whitespace-normal">
                  <Link
                    className="font-semibold text-accent hover:underline"
                    href={`/talents/${talent.id}`}
                  >
                    {talent.name}
                  </Link>
                  {talent.youtube_channels.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {talent.youtube_channels.map((channel) => (
                        <div key={channel.id}>
                          {channel.name && channel.name !== talent.name && (
                            <div className="text-caption text-muted">
                              YouTube: {channel.name}
                            </div>
                          )}
                          <div className="font-mono text-caption break-all text-muted">
                            {channel.youtube_channel_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="font-mono text-caption break-all text-muted">
                      {talent.id}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <TalentStatusBadge talent={talent} />
                </TableCell>
                <TableCell className="text-muted tabular-nums">
                  <time dateTime={talent.created_at}>
                    {formatDateTimeFromISO(talent.created_at)}
                  </time>
                </TableCell>
                <TableCell className="text-muted tabular-nums">
                  <time dateTime={talent.updated_at}>
                    {formatDateTimeFromISO(talent.updated_at)}
                  </time>
                </TableCell>
                <TableCell className="w-12 text-right">
                  {/* クライアントに送る値を、操作に要る項目だけにする */}
                  <TalentActions
                    talent={{
                      deleted_at: talent.deleted_at,
                      id: talent.id,
                      name: talent.name,
                      status: talent.status,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

/** 読み込み中の `TalentsList`。絞り込みと追加のボタン、5列の表を並べる */
export const TalentsListSkeleton = () => (
  <TableSkeleton
    columns={[
      {
        cell: (
          <div className="min-w-48 space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        ),
        id: "name",
      },
      { cell: <Skeleton className="h-5 w-16" />, id: "status" },
      { cell: <Skeleton className="h-4 w-36" />, id: "created_at" },
      { cell: <Skeleton className="h-4 w-36" />, id: "updated_at" },
      {
        align: "end",
        cell: <Skeleton className="size-7" />,
        className: "w-12",
        header: false,
        id: "actions",
      },
    ]}
    filterBar={
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <FilterBarSkeleton className="min-w-0 grow">
          <Skeleton className="h-10 w-full md:max-w-sm" />
          <Skeleton className="h-10 md:w-48" />
        </FilterBarSkeleton>
        <Skeleton className="h-9 w-44" />
      </div>
    }
  />
);
