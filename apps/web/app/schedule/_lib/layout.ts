/**
 * 1024px 以上の週のスケジュールで、項目の位置と高さを決める値。
 *
 * 項目の位置と高さは CSS で `--hour` から決まり、タイトルの行数は
 * `getTitleLines`（`schedule-item.tsx`）で計算する。両方がこのファイルの値を
 * 使うので、片方だけが変わることはない。
 */

/**
 * 1時間の高さ（rem）。`schedule-week.tsx` が `--hour` として CSS に渡す
 */
export const HOUR_HEIGHT_REM = 4;

/** 1rem の px。ルートの文字サイズは変えていないので、ブラウザの既定の 16px */
export const ROOT_FONT_SIZE = 16;

/**
 * タイトルより上の高さ（px）。ラベルとハッシュタグの行は、1024px 以上で
 * 広げていないときは出さないので含めない
 *
 * - 8: 項目の上下の余白（`schedule-item.tsx` の `py-1`、上下で 4px ずつ）
 * - 2: 項目の上下の枠（`border`、上下で 1px ずつ）
 * - 2: 項目の間の余白（`schedule-week.tsx` の `lg:pb-0.5`）
 * - 20: 1行目（`h-5`）
 * - 2: 1行目とタイトルの間（タイトルの `mt-0.5`）
 */
export const ITEM_CHROME_HEIGHT = 8 + 2 + 2 + 20 + 2;

/**
 * タイトルの1行の高さ（px）。`text-meta` の文字サイズ 14px（0.875rem）と行の
 * 高さ 1.6（`packages/tailwind-config/theme.css`）の積
 */
export const TITLE_LINE_HEIGHT = 0.875 * ROOT_FONT_SIZE * 1.6;
