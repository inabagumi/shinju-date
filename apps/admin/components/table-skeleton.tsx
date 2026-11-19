import { range } from "@shinju-date/helpers";
import { Skeleton, twMerge } from "@shinju-date/ui";
import type { ReactNode } from "react";

export interface TableSkeletonColumn {
  /** 列の中身を右に寄せる（数値や操作の列） */
  align?: "end";
  /** セルの中身。省略すると、1行の文字の `Skeleton`（`h-4 w-24`） */
  cell?: ReactNode;
  /** `<th>` と `<td>` に付けるクラス（読み込み後の列と同じ幅など） */
  className?: string;
  /** 見出しのない列（選択や操作など）は `false` */
  header?: boolean;
  /** 列を見分ける名前（React の key） */
  id: string;
}

interface TableSkeletonProps {
  /** 列の定義。読み込み後の表の列と、同じ数・同じ並びにする */
  columns: TableSkeletonColumn[];
  /** 表の上に置く帯（絞り込み・一括操作・索引など）の代わり。下の余白も含めて渡す */
  filterBar?: ReactNode;
  /** 行の数。読み込み後の1ページの件数に合わせる */
  rows?: number;
  /** `<table>` に付けるクラス（読み込み後の `Table` と同じ `min-w-*` など） */
  tableClassName?: string;
}

/**
 * 読み込み中の `Table`。列の定義を呼ぶ側が渡し、見出し行と本文の行を `Skeleton` で描く。
 * 全体を支援技術から隠す（`aria-hidden`）
 */
export const TableSkeleton = ({
  columns,
  filterBar,
  rows = 5,
  tableClassName,
}: TableSkeletonProps) => (
  <div aria-hidden="true">
    {filterBar}
    <div className="w-full overflow-hidden rounded-container border border-border bg-surface">
      <table className={twMerge("w-full border-collapse", tableClassName)}>
        <thead className="bg-muted">
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                className={twMerge("px-4 py-3", column.className)}
                key={column.id}
              >
                <div
                  className={twMerge(
                    "flex",
                    column.align === "end" && "justify-end"
                  )}
                >
                  {column.header === false ? (
                    <span className="block h-4" />
                  ) : (
                    <Skeleton className="h-4 w-12 bg-border" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {range(rows).map((row) => (
            <tr
              className="border-b border-border last:border-b-0"
              key={`table-row-skeleton-${row}`}
            >
              {columns.map((column) => (
                <td
                  className={twMerge("px-4 py-3", column.className)}
                  key={column.id}
                >
                  <div
                    className={twMerge(
                      "flex",
                      column.align === "end" && "justify-end"
                    )}
                  >
                    {column.cell ?? <Skeleton className="h-4 w-24" />}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

interface FilterBarSkeletonProps {
  /** `md` 以上で横に並ぶ絞り込みの代わり */
  children: ReactNode;
  className?: string;
}

/**
 * 読み込み中の `FilterBar`。狭い画面では開閉のボタン、`md` 以上では絞り込みを並べる
 */
export const FilterBarSkeleton = ({
  children,
  className,
}: FilterBarSkeletonProps) => (
  <div className={twMerge("flex flex-col gap-3", className)}>
    <Skeleton className="h-9 w-28 md:hidden" />
    <div className="hidden gap-3 md:flex md:flex-row md:flex-wrap md:items-end">
      {children}
    </div>
  </div>
);

/** 読み込み中の、見出し付きの入力欄（`Select`・`Input` など）。幅は `className` で指定する */
export const FieldSkeleton = ({ className }: { className?: string }) => (
  <div className={twMerge("flex flex-col gap-1", className)}>
    <Skeleton className="h-5 w-24" />
    <Skeleton className="h-10 w-full" />
  </div>
);
