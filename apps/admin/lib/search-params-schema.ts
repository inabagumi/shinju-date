import { z } from "zod";

/** URL のパラメータの値。同じ名前のパラメータが複数あると配列になる */
const rawSearchParamSchema = z
  .union([z.string(), z.array(z.string())])
  .optional();

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/**
 * 検索語のパラメータのスキーマ。前後の空白を取り除き、空なら `undefined` にする。
 * 複数あるときは、最初の値を使う
 */
export const searchTextParamSchema = () =>
  rawSearchParamSchema.transform(
    (value) => firstValue(value)?.trim() || undefined
  );

/**
 * 決まった値のどれかを取るパラメータのスキーマ。正しくない値やパラメータがないときは、
 * `defaultValue` にする。複数あるときは、最初の値を使う
 */
export const enumParamSchema = <
  const T extends readonly [string, ...string[]],
  const D extends T[number] | undefined,
>(
  values: T,
  defaultValue: D
) =>
  rawSearchParamSchema.transform((value): T[number] | D => {
    const first = firstValue(value);

    return first !== undefined && (values as readonly string[]).includes(first)
      ? (first as T[number])
      : defaultValue;
  });
