import * as z from 'zod'

/**
 * データベースの `uuid` 型の値（8-4-4-4-12 桁の16進数）。
 *
 * `z.uuid()` は RFC 9562 のバージョンとバリアントの桁も確かめるため、
 * `supabase/seed.sql` の `00000000-0000-0000-0000-000000000001` のような、
 * DB が受け付ける値を弾いてしまう。DB と揃えるため、`z.guid()` を使う。
 */
export const uuidSchema = z.guid({ message: '有効なIDではありません。' })
