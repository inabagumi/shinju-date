import type { ComponentPropsWithRef, ReactNode } from "react";

import { twMerge } from "../tw-merge.js";

export interface PageHeaderProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "title"
> {
  /** 見出しの右端に置く操作ボタン（「追加」など） */
  actions?: ReactNode;
  /** 見出しの下に表示する説明文 */
  description?: ReactNode;
  title: ReactNode;
}

/**
 * ページの見出し。見出し・説明文・操作ボタンを並べ、下に 24px の余白を取る。
 * 操作ボタンは右端に置き、狭い画面では見出しの下に折り返す。
 */
export function PageHeader({
  actions,
  className,
  description,
  title,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={twMerge(
        "mb-6 flex flex-wrap items-start justify-between gap-4",
        className
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-title font-bold text-foreground">{title}</h1>
        {description && (
          <div className="text-meta text-muted">{description}</div>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
