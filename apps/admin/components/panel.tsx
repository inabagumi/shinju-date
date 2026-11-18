import { range } from "@shinju-date/helpers";
import { Card, Skeleton, twMerge } from "@shinju-date/ui";
import type { CardProps } from "@shinju-date/ui";
import type { ReactNode } from "react";

/** `null`・`undefined`・`false`（`{cond && ...}` の結果）・空文字でない中身か */
function hasContent(node: ReactNode): boolean {
  return node != null && node !== false && node !== "";
}

export interface PanelProps extends Omit<CardProps, "title" | "variant"> {
  /** 見出しの右に置く操作ボタンなど */
  actions?: ReactNode;
  children?: ReactNode;
  /** 見出しの下に置く補足 */
  description?: ReactNode;
  /** パネルの見出し（`h2`） */
  title?: ReactNode;
}

/**
 * 管理画面の枠で囲んだ区画。見出し（任意）を上に置き、中身を `p-6` の余白の中に並べる。
 * 枠いっぱいに広げる一覧は、`DetailList` を使うか、`-mx-6 -mb-6` で余白の外に出す。
 * `Card` は `flex flex-col` だが、中身のボタンなどが横に引き伸ばされないよう `block` にする
 */
export function Panel({
  actions,
  children,
  className,
  description,
  title,
  ...props
}: PanelProps) {
  const hasHeading =
    hasContent(title) || hasContent(description) || hasContent(actions);

  return (
    <Card className={twMerge("block bg-surface p-6", className)} {...props}>
      {hasHeading && (
        <PanelHeading
          actions={actions}
          className={hasContent(children) ? "mb-4" : ""}
          description={description}
          title={title}
        />
      )}
      {children}
    </Card>
  );
}

interface PanelHeadingProps {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: ReactNode;
}

/** パネルの見出し。説明と操作ボタン（任意）を並べる */
export function PanelHeading({
  actions,
  className,
  description,
  title,
}: PanelHeadingProps) {
  return (
    <div
      className={twMerge(
        "flex flex-wrap items-start justify-between gap-4",
        className
      )}
    >
      {(hasContent(title) || hasContent(description)) && (
        <div className="min-w-0 space-y-1">
          {hasContent(title) && (
            <h2 className="text-heading font-bold">{title}</h2>
          )}
          {hasContent(description) && (
            <p className="max-w-text text-meta text-muted">{description}</p>
          )}
        </div>
      )}
      {hasContent(actions) && (
        <div className="flex flex-wrap gap-2">{actions}</div>
      )}
    </div>
  );
}

interface DetailListProps {
  children: ReactNode;
}

/**
 * 項目名と値の一覧。`Panel` の中で、余白の外まで広げ、行を `border` の線で区切る。
 * `Panel` の最後の中身として置く
 */
export function DetailList({ children }: DetailListProps) {
  return (
    <dl className="-mx-6 -mb-6 divide-y divide-border border-t border-border">
      {children}
    </dl>
  );
}

interface DetailRowProps {
  children: ReactNode;
  label: ReactNode;
}

export function DetailRow({ children, label }: DetailRowProps) {
  return (
    <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-meta font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-meta wrap-break-word text-foreground sm:col-span-2 sm:mt-0">
        {children}
      </dd>
    </div>
  );
}

interface PanelSkeletonProps {
  /** 見出しの右に置く操作ボタンの代わり（`Skeleton` など） */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** 見出しの下の補足。読み込み後と同じ文言を渡す */
  description?: ReactNode;
  /** パネルの見出し。読み込み後と同じ文言を渡す */
  title?: ReactNode;
}

/**
 * 読み込み中の `Panel`。枠と見出しは `Panel` と同じものを描き、中身に `Skeleton` を並べる。
 * 見出しは読み込みの前後で変わらないよう、読み込み後と同じ文言を渡す。
 * 全体を支援技術から隠す（`aria-hidden`）
 */
export function PanelSkeleton({
  actions,
  children,
  className,
  description,
  title,
}: PanelSkeletonProps) {
  return (
    <Panel
      actions={actions}
      aria-hidden="true"
      className={className}
      description={description}
      title={title}
    >
      {children}
    </Panel>
  );
}

interface DetailListSkeletonProps {
  /** 項目の数。読み込み後の `DetailRow` の数に合わせる */
  rows: number;
}

/** 読み込み中の `DetailList`。`PanelSkeleton` の最後の中身として置く */
export function DetailListSkeleton({ rows }: DetailListSkeletonProps) {
  return (
    <div className="-mx-6 -mb-6 divide-y divide-border border-t border-border">
      {range(rows).map((row) => (
        <div
          className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4"
          key={`detail-row-skeleton-${row}`}
        >
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-1 h-5 w-full max-w-64 sm:col-span-2 sm:mt-0" />
        </div>
      ))}
    </div>
  );
}
