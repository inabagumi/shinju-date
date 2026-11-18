import type { ComponentPropsWithRef } from "react";

import { twMerge } from "../tw-merge.js";

export type SkeletonProps = Omit<ComponentPropsWithRef<"span">, "children">;

/**
 * 読み込み中の部品の代わりに置く、1つの四角。大きさは `className` で指定する
 * （`className="h-4 w-32"` など）。角丸は既定で `rounded-control` にし、サムネイルなど
 * 入れ物の形には `rounded-container` を指定する。
 *
 * 見出しや段落の中にも置けるよう `<span>` を `block` で描く。文字の行に並べるときは
 * `inline-block` を指定する。支援技術には読ませない（`aria-hidden`）。
 */
export const Skeleton = ({ className, ...props }: SkeletonProps) => (
  <span
    aria-hidden="true"
    className={twMerge(
      "block animate-pulse rounded-control bg-muted",
      className
    )}
    {...props}
  />
);
