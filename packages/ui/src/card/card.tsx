import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { twMerge } from "../tw-merge.js";

const cardVariants = cva(
  "flex flex-col overflow-hidden rounded-container border border-border text-foreground",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-muted",
      },
    },
  }
);

export type CardProps = ComponentPropsWithRef<"div"> &
  VariantProps<typeof cardVariants>;

export const Card = ({ className, variant, ...props }: CardProps) => (
  <div className={twMerge(cardVariants({ variant }), className)} {...props} />
);

export const CardHeader = ({
  className,
  ...props
}: ComponentPropsWithRef<"div">) => (
  <div className={twMerge("p-6 pb-0", className)} {...props} />
);

export const CardContent = ({
  className,
  ...props
}: ComponentPropsWithRef<"div">) => (
  <div className={twMerge("p-6", className)} {...props} />
);
