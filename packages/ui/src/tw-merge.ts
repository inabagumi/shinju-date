import { extendTailwindMerge } from "tailwind-merge";

/**
 * `theme.css` で追加した文字サイズ（`--text-*`）。tailwind-merge は知らない
 * `text-*` を文字色として扱い、`text-body text-foreground` の `text-body` を
 * 消してしまうため、文字サイズとして登録する。
 */
export const FONT_SIZES = [
  "display",
  "title",
  "heading",
  "body",
  "meta",
  "caption",
] as const;

/** `theme.css` で追加した最大幅（`--container-*`） */
export const CONTAINERS = ["text"] as const;

/**
 * `theme.css` で追加した角丸（`--radius-*`）。登録しないと
 * `rounded-md rounded-control` のような既定の角丸との衝突を解決できず、
 * 両方が残ってしまう。
 */
export const RADII = ["control", "container"] as const;

/** `theme.css` で追加した影（`--shadow-*`）。登録する理由は `RADII` と同じ */
export const SHADOWS = ["overlay"] as const;

/**
 * `theme.css` で追加した開閉の動き（`--animate-*`）。登録しないと、
 * `animate-none` や、ほかの動きのクラスで置き換えられない。
 */
export const ANIMATIONS = [
  "fade-in",
  "fade-out",
  "scale-in",
  "scale-out",
  "slide-in",
  "swipe-out",
] as const;

/**
 * `theme.css` で追加したフォーカスの見た目（`@utility`）。どれも同じ部品に
 * 1つだけ付けるものなので、後から渡したもので置き換える。
 */
export const FOCUS_RINGS = [
  "focus-ring",
  "field-focus-ring",
  "field-focus-ring-danger",
] as const;

/**
 * `theme.css` の追加分を登録した `twMerge`。`tailwind-merge` から直接
 * インポートせず、`@shinju-date/ui` からインポートして使う。
 */
export const twMerge = extendTailwindMerge<"focus-ring">({
  extend: {
    classGroups: {
      "focus-ring": [...FOCUS_RINGS],
    },
    theme: {
      animate: [...ANIMATIONS],
      container: [...CONTAINERS],
      radius: [...RADII],
      shadow: [...SHADOWS],
      text: [...FONT_SIZES],
    },
  },
});
