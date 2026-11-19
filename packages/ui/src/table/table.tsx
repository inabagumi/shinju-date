import type { ComponentPropsWithRef } from "react";

import { twMerge } from "../tw-merge.js";

/**
 * 表。外枠を `border` と角丸で囲み、列がはみ出す場合は表の中で横にスクロールする。
 * 外枠を `relative` にして、セルの中の `sr-only` などの絶対配置の要素も外枠の中に
 * 収め、ページ全体が横にはみ出さないようにする。
 * スクロールする入れ物は、キーボードでも横にスクロールできるよう Tab で
 * フォーカスできる。`className` は `<table>` に付く。
 *
 * ```tsx
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>タイトル</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>動画のタイトル</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * ```
 */
export const Table = ({
  className,
  ...props
}: ComponentPropsWithRef<"table">) => (
  <div
    className="relative w-full overflow-x-auto rounded-container border border-border bg-surface focus-ring"
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- 横にはみ出した列をキーボードでもスクロールできるようにする
    tabIndex={0}
  >
    <table
      className={twMerge(
        "w-full border-collapse text-left text-meta text-foreground",
        className
      )}
      {...props}
    />
  </div>
);

/** 見出し行をまとめる `<thead>`。地は `bg-muted` */
export const TableHeader = ({
  className,
  ...props
}: ComponentPropsWithRef<"thead">) => (
  <thead className={twMerge("bg-muted", className)} {...props} />
);

/** 本文の行をまとめる `<tbody>` */
export const TableBody = ({
  className,
  ...props
}: ComponentPropsWithRef<"tbody">) => (
  <tbody
    className={twMerge("[&>tr:last-child]:border-b-0", className)}
    {...props}
  />
);

/** 行。下端を `border` の線で区切り、ホバーで地を `bg-muted` にする */
export const TableRow = ({
  className,
  ...props
}: ComponentPropsWithRef<"tr">) => (
  <tr
    className={twMerge(
      "border-b border-border transition-colors hover:bg-muted",
      className
    )}
    {...props}
  />
);

/** 見出しのセル（`<th>`）。`scope` は既定で `col` */
export const TableHead = ({
  className,
  scope = "col",
  ...props
}: ComponentPropsWithRef<"th">) => (
  <th
    className={twMerge(
      "px-4 py-3 text-left align-middle text-caption font-semibold whitespace-nowrap text-muted",
      className
    )}
    scope={scope}
    {...props}
  />
);

/**
 * 本文のセル（`<td>`）。既定では折り返さない。長い文章を折り返す場合は
 * `className="whitespace-normal"` を指定する。
 */
export const TableCell = ({
  className,
  ...props
}: ComponentPropsWithRef<"td">) => (
  <td
    className={twMerge("px-4 py-3 align-middle whitespace-nowrap", className)}
    {...props}
  />
);
