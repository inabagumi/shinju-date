import { cva } from "class-variance-authority";
import type { AriaRole, ComponentPropsWithRef, ReactNode } from "react";

import { twMerge } from "../tw-merge.js";

/**
 * 知らせの意味。危険（失敗・削除済みなど）は `danger`、注意（引退・確認が必要な
 * 操作など）は `warning`、成功は `success`、どれにも当たらない中立の知らせは
 * `neutral`
 */
export type AlertTone = "danger" | "neutral" | "success" | "warning";

const alertVariants = cva(
  "flex flex-col gap-3 rounded-container border p-4 text-meta text-foreground sm:flex-row sm:items-center sm:justify-between",
  {
    defaultVariants: {
      tone: "neutral",
    },
    variants: {
      tone: {
        danger: "border-danger/30 bg-danger/10",
        neutral: "border-border bg-muted",
        success: "border-success/30 bg-success/10",
        warning: "border-warning/30 bg-warning/10",
      },
    },
  }
);

// 割り込んで読み上げるのは、危険と注意の知らせだけにする
const DEFAULT_ROLES = {
  danger: "alert",
  neutral: "status",
  success: "status",
  warning: "alert",
} as const satisfies Record<AlertTone, AriaRole>;

export interface AlertProps extends Omit<
  ComponentPropsWithRef<"div">,
  "title"
> {
  /** 右端に置くリンクやボタン。狭い画面では本文の下に回る */
  action?: ReactNode;
  /** 本文 */
  children: ReactNode;
  /** 既定は `danger` と `warning` が `alert`、ほかは `status` */
  role?: AriaRole | undefined;
  /** 本文の上に置く太字の1行 */
  title?: ReactNode;
  /** 知らせの意味。既定は `neutral` */
  tone?: AlertTone | undefined;
}

/**
 * 状態を知らせる枠。地は `tone` の色の 10%、枠線は 30% で、文字は
 * `text-foreground` にする。
 */
export const Alert = ({
  action,
  children,
  className,
  role,
  title,
  tone = "neutral",
  ...props
}: AlertProps) => (
  <div
    className={twMerge(alertVariants({ tone }), className)}
    role={role ?? DEFAULT_ROLES[tone]}
    {...props}
  >
    <div className="min-w-0 flex-1">
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
