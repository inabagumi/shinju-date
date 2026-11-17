/**
 * キーボードでフォーカスしたときの見た目。
 *
 * ボタン・リンク・タブなど、押して操作する部品に付ける。部品の外側に、2px 離して
 * `accent` の線を出す。`focus-visible` なので、マウスでのクリックでは出ない。
 */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/**
 * 文字を入力する部品（`Input`、`Select`、`Textarea`、`MultiSelect` の開くボタン）の
 * フォーカスの見た目。枠の線を `accent` にし、同じ色の線を外側に重ねる。
 *
 * 部品の `outline-none` は付けない（`outline-2` の線の種類が `none` になり、線が消える）。
 */
export const FIELD_FOCUS_RING =
  'focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent'

/**
 * 入力に誤りがある状態の、文字を入力する部品のフォーカスの見た目。
 * `FIELD_FOCUS_RING` の `accent` を `danger` にしたもの。
 */
export const FIELD_FOCUS_RING_DANGER =
  'focus-visible:border-danger focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-danger'
