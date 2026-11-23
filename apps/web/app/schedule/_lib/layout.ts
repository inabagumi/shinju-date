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

/**
 * 時間の重なる項目を重ねて置くときの値。重なる項目は、`layoutDay` の列の順に
 * 少しずつ右へずらし、日の列の右端まで伸ばして重ねる。後に始まる項目ほど前面に
 * 置く（Google カレンダーの週の表示と同じ）。前面の項目は、背面の項目より後に
 * 始まるか、同時に始まって右の列にあるので、背面の項目も、開始時刻の位置の左端
 * （ずらした幅の帯）は隠れず、そこにマウスを乗せられる。
 *
 * ずらす幅は、最も右の項目の幅が `OVERLAP_FRONT_WIDTH` 以上になるように決める。
 * 重なる項目が多く、ずらす幅が `OVERLAP_MIN_OFFSET` より狭くなるときは
 * `OVERLAP_MIN_OFFSET` にし、最も右の項目を狭くする。それでも、最も右の項目は
 * `OVERLAP_FRONT_MIN_WIDTH` より狭くはしない。また、均等に分けた幅（重なる
 * 項目の列の数で日の列を割った幅）より広くはずらさない
 */

/**
 * 最も右の項目の幅。1行目のアイコンと開始時刻、タイトルの数文字が入る幅
 */
export const OVERLAP_FRONT_WIDTH = "5.5rem";

/**
 * 最も右の項目の最低の幅。重なる項目がとても多くても、1行目のアイコンと開始
 * 時刻が入り、タイトルが1文字ずつ縦に並ばない幅
 */
export const OVERLAP_FRONT_MIN_WIDTH = "5rem";

/**
 * 背面の項目が見える帯の最低の幅。左端の線（4px）とその右の地が見え、
 * マウスを乗せられる幅
 */
export const OVERLAP_MIN_OFFSET = "0.5rem";

/**
 * 重なる項目を置くときに、列ごとにずらす幅。`100%` は日の列の幅を指す
 */
export const getOverlapOffset = (columns: number): string => {
  if (columns <= 1) {
    return "0px";
  }

  const gaps = columns - 1;

  return `min(100% / ${columns}, (100% - ${OVERLAP_FRONT_MIN_WIDTH}) / ${gaps}, max((100% - ${OVERLAP_FRONT_WIDTH}) / ${gaps}, ${OVERLAP_MIN_OFFSET}))`;
};
