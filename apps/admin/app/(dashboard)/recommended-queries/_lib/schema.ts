import * as z from 'zod'

/** 手動のおすすめクエリの、前後の空白を除いた長さの上限 */
const MAX_RECOMMENDED_QUERY_LENGTH = 100

/**
 * 手動のおすすめクエリ（`addQueryAction`、`deleteQueryAction` の引数）。
 * 前後の空白を除き、1〜{@link MAX_RECOMMENDED_QUERY_LENGTH} 文字にする。
 */
export const recommendedQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_RECOMMENDED_QUERY_LENGTH)
