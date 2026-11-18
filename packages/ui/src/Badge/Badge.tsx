import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { twMerge } from "../tw-merge.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-control border px-2 py-0.5 text-caption font-semibold whitespace-nowrap",
  {
    defaultVariants: {
      variant: "info",
    },
    variants: {
      /**
       * 状態の意味で選ぶ。成功は `success`、注意は `warning`、危険（失敗・削除済み
       * など）は `danger`、中立（終了・非表示など）は `neutral`
       */
      variant: {
        danger: "border-danger/30 bg-danger/10 text-danger",
        info: "border-accent/30 bg-accent/10 text-accent",
        neutral: "border-border text-muted",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
      },
    },
  }
);

export type BadgeProps = ComponentPropsWithRef<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ variant, className, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
