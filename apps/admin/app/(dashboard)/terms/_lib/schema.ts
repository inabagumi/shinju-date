import * as z from "zod";

import { uuidSchema } from "@/lib/schemas";

const TERM_REQUIRED_ERROR = "用語を入力してください。";

/** 読み方と同義語の並び。前後の空白を除き、空の値は捨てる */
const termValuesSchema = z
  .array(z.string().trim())
  .transform((values) => values.filter(Boolean))
  .default([]);

/**
 * 用語の作成と更新のフォーム。読み方と同義語は `readings[0]`、`synonyms[0]` の
 * ようなキーで届くので、`parseFormData` で配列にまとめてから検証する。
 */
export const termSchema = z.object({
  readings: termValuesSchema,
  synonyms: termValuesSchema,
  term: z
    .string({ error: TERM_REQUIRED_ERROR })
    .trim()
    .min(1, TERM_REQUIRED_ERROR),
});

/**
 * 用語の更新のフォーム。`termSchema` に、用語の ID（隠しフィールド）を加える。
 */
export const updateTermSchema = termSchema.extend({
  id: uuidSchema,
});
