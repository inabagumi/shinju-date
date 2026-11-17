import * as z from 'zod'
import { FEATURE_REQUEST_STATUSES } from './feature-request-status'

const feedbackIdSchema = z.uuid()

/** 状態の変更のフォーム（`status` は、DB の enum の値） */
export const feedbackStatusFormSchema = z.object({
  id: feedbackIdSchema,
  status: z.enum(FEATURE_REQUEST_STATUSES),
})

/** メモの保存のフォーム。空のメモは、メモを消すことを表す */
export const feedbackMemoFormSchema = z.object({
  admin_memo: z.string(),
  id: feedbackIdSchema,
})

/** 既読と未読の切り替えのフォーム。`is_read` は、切り替え先の値 */
export const feedbackReadFormSchema = z.object({
  id: feedbackIdSchema,
  is_read: z.enum(['true', 'false']).transform((value) => value === 'true'),
})
