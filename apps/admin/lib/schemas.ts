import * as z from "zod";

/**
 * Server Action の引数の検証に失敗したときに、画面に見せる文。
 * 引数は画面が組み立てる値で、利用者が直せるものではないため、項目ごとに分けない
 */
export const INVALID_INPUT_ERROR_MESSAGE = "入力が正しくありません。";

/** {@link uuidListSchema} で一度に受け付ける ID の数の上限 */
export const MAX_UUID_LIST_LENGTH = 100;

/**
 * データベースの `uuid` 型の値（8-4-4-4-12 桁の16進数）。
 *
 * `z.uuid()` は RFC 9562 のバージョンとバリアントの桁も確かめるため、
 * `supabase/seed.sql` の `00000000-0000-0000-0000-000000000001` のような、
 * DB が受け付ける値を弾いてしまう。DB と揃えるため、`z.guid()` を使う。
 */
export const uuidSchema = z.guid({ message: "有効なIDではありません。" });

/**
 * まとめて操作する行の ID の並び（1件以上、{@link MAX_UUID_LIST_LENGTH} 件以下、重複なし）。
 * DB の `uuid` 型は大文字と小文字を区別しないので、重複も区別せずに確かめる。
 */
export const uuidListSchema = z
  .array(uuidSchema, { message: "IDの並びではありません。" })
  .min(1, "IDが指定されていません。")
  .max(
    MAX_UUID_LIST_LENGTH,
    `一度に指定できるIDは${MAX_UUID_LIST_LENGTH}件までです。`
  )
  .refine(
    (ids) => new Set(ids.map((id) => id.toLowerCase())).size === ids.length,
    { message: "同じIDが重複しています。" }
  );
