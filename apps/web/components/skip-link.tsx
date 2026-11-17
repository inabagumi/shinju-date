/**
 * スキップリンクの移動先。各ページの `<main>` に `id` として付ける。
 */
export const MAIN_CONTENT_ID = 'main-content'

/**
 * キーボード操作でヘッダーを飛ばして本文へ移動するためのリンク。
 * 普段は隠しておき、フォーカスされたときだけ画面の左上に表示する。
 */
export default function SkipLink() {
  return (
    <a
      className="sr-only rounded-control bg-accent text-meta font-semibold text-accent-foreground shadow-overlay focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:px-4 focus:py-2 focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      href={`#${MAIN_CONTENT_ID}`}
    >
      本文へスキップ
    </a>
  )
}
