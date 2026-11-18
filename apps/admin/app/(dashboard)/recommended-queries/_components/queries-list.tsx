import {
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shinju-date/ui";

import { SearchInput } from "@/components/search-input";
import { TableSkeleton } from "@/components/table-skeleton";

import { AddQueryForm } from "./add-query-form";
import { DeleteQueryButton } from "./delete-query-button";

const AUTO_QUERIES_DESCRIPTION =
  "検索トレンドに基づいて自動的に選出されたクエリです。スコアは時間減衰を考慮した重み付けスコアです。";

interface QueriesListProps {
  /** 検索で絞り込んだ、手動追加のクエリ */
  manualQueries: string[];
  /** 手動追加のクエリの全件の数 */
  manualTotal: number;
  /** 検索で絞り込んだ、自動選出のクエリ */
  autoQueries: { query: string; score: number }[];
  /** 自動選出のクエリの全件の数 */
  autoTotal: number;
  /** URL の `search`。前後の空白を取り除いたもの */
  search: string | undefined;
}

/**
 * おすすめクエリの一覧。表と行はサーバーで描き、追加のフォーム、検索ボックス、
 * 行ごとの削除のボタンだけをクライアントの部品に任せる
 */
export function QueriesList({
  manualQueries,
  manualTotal,
  autoQueries,
  autoTotal,
  search,
}: QueriesListProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AddQueryForm />

        {/* Search */}
        <SearchInput
          aria-label="クエリを検索"
          className="sm:max-w-md"
          placeholder="クエリを検索..."
        />
      </div>

      {/* Manual Queries List */}
      <section className="space-y-3">
        <h2 className="text-heading font-bold">
          手動追加クエリ
          <span className="ml-2 text-meta font-normal text-muted tabular-nums">
            {manualTotal}件
          </span>
        </h2>
        {manualQueries.length === 0 ? (
          <EmptyState
            className="rounded-container border border-border bg-surface"
            title={
              search
                ? "検索結果がありません。"
                : "手動追加されたおすすめクエリがありません。"
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>クエリ</TableHead>
                <TableHead className="w-24 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manualQueries.map((query) => (
                <TableRow key={query}>
                  <TableCell className="whitespace-normal">{query}</TableCell>
                  <TableCell className="text-right">
                    <DeleteQueryButton query={query} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Auto Queries List */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-heading font-bold">
            自動選出クエリ
            <span className="ml-2 text-meta font-normal text-muted tabular-nums">
              {autoTotal}件
            </span>
          </h2>
          <p className="max-w-text text-meta text-muted">
            {AUTO_QUERIES_DESCRIPTION}
          </p>
        </div>
        {autoQueries.length === 0 ? (
          <EmptyState
            className="rounded-container border border-border bg-surface"
            title={
              search
                ? "検索結果がありません。"
                : "自動選出されたおすすめクエリがありません。"
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>クエリ</TableHead>
                <TableHead className="w-32 text-right">スコア</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {autoQueries.map(({ query, score }) => (
                <TableRow key={query}>
                  <TableCell className="whitespace-normal">{query}</TableCell>
                  <TableCell className="text-right text-muted tabular-nums">
                    {score.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

/**
 * 読み込み中の `QueriesList`。追加のフォームと検索欄、手動追加と自動選出の2つの表
 * （それぞれ2列）を並べる
 */
export function QueriesListSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2 sm:max-w-md">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-9 w-16" />
        </div>
        <Skeleton className="h-10 w-full sm:max-w-md" />
      </div>

      <section className="space-y-3">
        <h2 className="text-heading font-bold">手動追加クエリ</h2>
        <TableSkeleton
          columns={[
            { cell: <Skeleton className="h-4 w-48" />, id: "query" },
            {
              align: "end",
              cell: <Skeleton className="h-7 w-14" />,
              className: "w-24",
              id: "actions",
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-heading font-bold">自動選出クエリ</h2>
          <p className="max-w-text text-meta text-muted">
            {AUTO_QUERIES_DESCRIPTION}
          </p>
        </div>
        <TableSkeleton
          columns={[
            { cell: <Skeleton className="h-4 w-48" />, id: "query" },
            {
              align: "end",
              cell: <Skeleton className="h-4 w-10" />,
              className: "w-32",
              id: "score",
            },
          ]}
        />
      </section>
    </div>
  );
}
