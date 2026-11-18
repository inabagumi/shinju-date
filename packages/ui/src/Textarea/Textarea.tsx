import type { VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { inputVariants } from "../Input/Input.js";
import { twMerge } from "../tw-merge.js";

export type TextareaProps = ComponentPropsWithRef<"textarea"> &
  VariantProps<typeof inputVariants>;

/**
 * 複数行の入力欄。`Input` と同じ余白・枠・角丸・フォーカス表示にする。
 */
export const Textarea = ({
  className,
  inputSize,
  variant,
  ...props
}: TextareaProps) => (
  <textarea
    className={twMerge(
      inputVariants({ inputSize, variant }),
      "block",
      className
    )}
    {...props}
  />
);
