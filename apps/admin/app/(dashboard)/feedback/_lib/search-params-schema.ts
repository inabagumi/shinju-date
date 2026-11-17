import { z } from 'zod'
import { enumParamSchema } from '@/lib/search-params-schema'
import { FEATURE_REQUEST_STATUSES } from './feature-request-status'

/** 既読の絞り込みの値 */
const READ_FILTERS = ['read', 'unread'] as const

/**
 * 機能要望の一覧の URL のパラメータのスキーマ。
 * どちらも、パラメータがないか正しくない値のときは、`undefined`（すべて）にする
 */
export const feedbackSearchParamsSchema = z.object({
  read: enumParamSchema(READ_FILTERS, undefined),
  status: enumParamSchema(FEATURE_REQUEST_STATUSES, undefined),
})

export type FeedbackSearchParams = z.infer<typeof feedbackSearchParamsSchema>
