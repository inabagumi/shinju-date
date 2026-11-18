import type { ComponentPropsWithRef, ReactNode } from "react";

import { twMerge } from "../tw-merge.js";

export interface EmptyStateProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "title"
> {
  /** 見出しの下に置く操作ボタン（「追加」など） */
  action?: ReactNode;
  /** 見出しの下に表示する補足 */
  description?: ReactNode;
  /** 見出しの上に表示するアイコン。読み上げからは除く */
  icon?: ReactNode;
  /** 1行の見出し（「動画がありません」など） */
  title: ReactNode;
}

/**
 * データがないことを伝える表示。高さは内容なりで、大きな空白は作らない。
 * 表やカードの中に置く場合も、そのまま中央に並ぶ。
 */
export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        "flex flex-col items-center gap-2 px-4 py-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div aria-hidden="true" className="text-muted [&_svg]:size-8">
          {icon}
        </div>
      )}
      <p className="text-body leading-normal font-semibold text-foreground">
        {title}
      </p>
      {description && (
        <div className="max-w-text text-meta text-muted">{description}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
