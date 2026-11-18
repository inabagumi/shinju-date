import * as z from 'zod'
import { FEATURE_REQUEST_STATUSES } from './feature-request-status'

/**
 * 検証に失敗したときの文。入力欄は選択肢とメモだけで、ほかの値は隠しフィールド
 * なので、検証の失敗は項目ごとに分けず、すべてこの文にする
 */
export const INVALID_INPUT_ERROR = '入力が正しくありません。'

/**
 * フィードバックの ID。DB の `uuid` 型と同じく、RFC 9562 のバージョンとバリアントを
 * 問わず 8-4-4-4-12 桁の16進数を受け付ける（シードの ID は、バージョンの桁が `0`）
 */
const feedbackIdSchema = z.guid({ error: INVALID_INPUT_ERROR })

/** 状態の変更のフォーム（`status` は、DB の enum の値） */
export const feedbackStatusFormSchema = z.object({
  id: feedbackIdSchema,
  status: z.enum(FEATURE_REQUEST_STATUSES, { error: INVALID_INPUT_ERROR }),
})

/** メモの保存のフォーム。空のメモは、メモを消すことを表す */
export const feedbackMemoFormSchema = z.object({
  admin_memo: z.string({ error: INVALID_INPUT_ERROR }),
  id: feedbackIdSchema,
})

/** 既読と未読の切り替えのフォーム。`is_read` は、切り替え先の値 */
export const feedbackReadFormSchema = z.object({
  id: feedbackIdSchema,
  is_read: z
    .enum(['true', 'false'], { error: INVALID_INPUT_ERROR })
    .transform((value) => value === 'true'),
})

/**
 * 検証のエラーを、項目に結び付かないエラー（`generic`）にする項目。
 * 選択肢とメモの入力欄にも、エラーを出す場所がない
 */
export const FEEDBACK_FORM_FIELDS = [
  'admin_memo',
  'id',
  'is_read',
  'status',
] as const
