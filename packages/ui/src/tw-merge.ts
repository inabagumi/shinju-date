import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `theme.css` で追加した文字サイズ（`--text-*`）。tailwind-merge は知らない
 * `text-*` を文字色として扱い、`text-body text-foreground` の `text-body` を
 * 消してしまうため、文字サイズとして登録する。
 */
export const FONT_SIZES = [
  'display',
  'title',
  'heading',
  'body',
  'meta',
  'caption',
] as const

/** `theme.css` で追加した最大幅（`--container-*`） */
export const CONTAINERS = ['text'] as const

/**
 * `theme.css` の追加分を登録した `twMerge`。`tailwind-merge` から直接
 * インポートせず、`@shinju-date/ui` からインポートして使う。
 */
export const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      container: [...CONTAINERS],
      text: [...FONT_SIZES],
    },
  },
})
