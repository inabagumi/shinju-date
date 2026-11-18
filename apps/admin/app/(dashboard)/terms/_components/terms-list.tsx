import { range } from "@shinju-date/helpers";
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
import { BookOpen } from "lucide-react";
import { Fragment } from "react";

import { SearchInput } from "@/components/search-input";
import { TableSkeleton } from "@/components/table-skeleton";

import type { TermGroup } from "../_lib/group-terms";
import { DeleteTermButton } from "./delete-term-button";
import { TermModal } from "./term-modal";

interface Term {
  id: string;
  term: string;
  readings: string[];
  synonyms: string[];
}

/** 頭文字のグループの行の ID。索引のリンク先にする */
function getGroupId(group: string): string {
  return `group-${group}`;
}

/**
 * 用語の一覧の上に並べる、検索ボックスと追加のボタン。データを待たずに出せるため、
 * 一覧の Suspense の外に置く
 */
export function TermsToolbar() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <SearchInput
        aria-label="用語を検索"
        className="sm:max-w-md"
        placeholder="用語、読み方、類義語で検索..."
      />
      <TermModal />
    </div>
  );
}

interface TermsListProps {
  /** 検索と頭文字のグループ分けを済ませた用語 */
  groups: TermGroup<Term>[];
  /** URL の `search`。前後の空白を取り除いたもの */
  search: string | undefined;
}

/**
 * 頭文字の索引と、頭文字ごとにまとめた用語の表。サーバーで描き、編集のモーダルと
 * 削除のボタンだけをクライアントの部品に任せる
 */
export function TermsList({ groups, search }: TermsListProps) {
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen />}
        title={search ? "検索結果がありません。" : "用語がありません。"}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 頭文字の索引。検索している間は出さない */}
      {!search && (
        <nav aria-label="頭文字の索引" className="flex flex-wrap gap-1">
          {groups.map(({ group }) => (
            <Button
              asChild
              className="min-w-9 px-2"
              key={group}
              size="sm"
              variant="ghost"
            >
              <a href={`#${getGroupId(group)}`}>{group}</a>
            </Button>
          ))}
        </nav>
      )}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>用語</TableHead>
            <TableHead>読み方</TableHead>
            <TableHead>類義語</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(({ group, terms }) => (
            <Fragment key={group}>
              <TableRow
                className="scroll-mt-16 bg-muted/50 hover:bg-muted/50"
                id={getGroupId(group)}
              >
                <TableHead
                  className="py-2 text-foreground"
                  colSpan={4}
                  scope="colgroup"
                >
                  {group}
                  <span className="ml-2 font-normal text-muted tabular-nums">
                    {terms.length}件
                  </span>
                </TableHead>
              </TableRow>
              {terms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-semibold">{term.term}</TableCell>
                  <TableCell className="whitespace-normal text-muted">
                    {term.readings.join("、") || "—"}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted">
                    {term.synonyms.join("、") || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-4">
                      <TermModal term={term} />
                      <DeleteTermButton id={term.id} term={term.term} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** 読み込み中の `TermsList`。頭文字の索引と、4列の表を並べる */
export function TermsListSkeleton() {
  return (
    <TableSkeleton
      columns={[
        { cell: <Skeleton className="h-4 w-24" />, id: "term" },
        { cell: <Skeleton className="h-4 w-32" />, id: "readings" },
        { cell: <Skeleton className="h-4 w-40" />, id: "synonyms" },
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
      filterBar={
        <div className="mb-4 flex min-h-8 flex-wrap gap-1">
          {range(8).map((item) => (
            <Skeleton className="h-8 w-9" key={`term-index-skeleton-${item}`} />
          ))}
        </div>
      }
      rows={6}
    />
  );
}
