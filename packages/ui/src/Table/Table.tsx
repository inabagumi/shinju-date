import type { ComponentPropsWithRef } from 'react'
import { twMerge } from '../tw-merge'

/**
 * 表。外枠を `border` と角丸で囲み、列がはみ出す場合は表の中で横にスクロールする。
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
export function Table({ className, ...props }: ComponentPropsWithRef<'table'>) {
  return (
    <div
      className="w-full overflow-x-auto rounded-container border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: 横にはみ出した列をキーボードでもスクロールできるようにする
      tabIndex={0}
    >
      <table
        className={twMerge(
          'w-full border-collapse text-left text-meta text-foreground',
          className,
        )}
        {...props}
      />
    </div>
  )
}

/** 見出し行をまとめる `<thead>`。地は `bg-muted` */
export function TableHeader({
  className,
  ...props
}: ComponentPropsWithRef<'thead'>) {
  return <thead className={twMerge('bg-muted', className)} {...props} />
}

/** 本文の行をまとめる `<tbody>` */
export function TableBody({
  className,
  ...props
}: ComponentPropsWithRef<'tbody'>) {
  return (
    <tbody
      className={twMerge('[&>tr:last-child]:border-b-0', className)}
      {...props}
    />
  )
}

/** 行。下端を `border` の線で区切り、ホバーで地を `bg-muted` にする */
export function TableRow({ className, ...props }: ComponentPropsWithRef<'tr'>) {
  return (
    <tr
      className={twMerge(
        'border-b border-border transition-colors hover:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

/** 見出しのセル（`<th>`）。`scope` は既定で `col` */
export function TableHead({
  className,
  scope = 'col',
  ...props
}: ComponentPropsWithRef<'th'>) {
  return (
    <th
      className={twMerge(
        'px-4 py-3 text-left align-middle text-caption font-semibold whitespace-nowrap text-muted',
        className,
      )}
      scope={scope}
      {...props}
    />
  )
}

/**
 * 本文のセル（`<td>`）。既定では折り返さない。長い文章を折り返す場合は
 * `className="whitespace-normal"` を指定する。
 */
export function TableCell({
  className,
  ...props
}: ComponentPropsWithRef<'td'>) {
  return (
    <td
      className={twMerge('px-4 py-3 align-middle whitespace-nowrap', className)}
      {...props}
    />
  )
}
