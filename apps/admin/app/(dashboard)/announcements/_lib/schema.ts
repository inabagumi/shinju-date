import * as z from 'zod'

const MESSAGE_REQUIRED_ERROR = 'お知らせメッセージを入力してください。'
const LEVEL_INVALID_ERROR = 'レベルを選択してください。'
const PERIOD_REQUIRED_ERROR = '開始日時と終了日時を入力してください。'
const PERIOD_FORMAT_ERROR = '日時の形式が正しくありません。'
const PERIOD_ORDER_ERROR = '終了日時は開始日時より後に設定してください。'
const ID_REQUIRED_ERROR = 'IDが指定されていません。'

/**
 * お知らせの種類。DB の `announcements.level` は `text` 型で enum ではないため、
 * 受け付ける値の一覧をここに置く
 */
export const ANNOUNCEMENT_LEVELS = ['info', 'warning', 'alert'] as const

export type AnnouncementLevel = (typeof ANNOUNCEMENT_LEVELS)[number]

/**
 * 掲載の開始日時・終了日時。`Temporal.Instant.from` で読める文字列を受け付け、
 * `Temporal.Instant` に直す
 */
const instantSchema = z
  .string({ error: PERIOD_REQUIRED_ERROR })
  .trim()
  .min(1, PERIOD_REQUIRED_ERROR)
  .transform((value, context) => {
    try {
      return Temporal.Instant.from(value)
    } catch {
      context.addIssue({ code: 'custom', message: PERIOD_FORMAT_ERROR })

      return z.NEVER
    }
  })

/**
 * お知らせの作成と更新のフォーム。
 *
 * `start_at` と `end_at` は、画面の `start_at_local`・`end_at_local` から
 * 送信の前に作る値で、対応する入力欄がない。`adminFormAction` の `hiddenFields` に
 * `ANNOUNCEMENT_HIDDEN_FIELDS` を渡し、日時のエラーを項目に結び付かないエラー
 * （`generic`）にする。
 */
export const announcementSchema = z
  .object({
    enabled: z
      .string()
      .optional()
      .transform((value) => value === 'true'),
    end_at: instantSchema,
    level: z
      .enum(ANNOUNCEMENT_LEVELS, { error: LEVEL_INVALID_ERROR })
      .default('info'),
    message: z
      .string({ error: MESSAGE_REQUIRED_ERROR })
      .trim()
      .min(1, MESSAGE_REQUIRED_ERROR),
    start_at: instantSchema,
  })
  .refine(
    ({ end_at: endAt, start_at: startAt }) =>
      Temporal.Instant.compare(startAt, endAt) < 0,
    {
      message: PERIOD_ORDER_ERROR,
      path: ['end_at'],
      // 日時が読めなかったときは、比べられない。ほかの項目のエラーもあるときは、
      // 先にそれを直してもらう
      when: ({ issues }) => issues.length === 0,
    },
  )

/**
 * お知らせの更新のフォーム。`announcementSchema` に、お知らせの ID
 * （隠しフィールド）を加える。
 */
export const updateAnnouncementSchema = announcementSchema.extend({
  id: z.string({ error: ID_REQUIRED_ERROR }).min(1, ID_REQUIRED_ERROR),
})

/** 画面に対応する入力欄がない項目。エラーは `generic` にする */
export const ANNOUNCEMENT_HIDDEN_FIELDS = ['end_at', 'start_at'] as const
