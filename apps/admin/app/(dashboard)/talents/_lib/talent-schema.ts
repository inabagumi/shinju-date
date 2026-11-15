import * as z from 'zod'

const TALENT_READING_MESSAGE =
  '読み仮名はひらがなと長音符（ー）で入力してください。'

/**
 * ひらがなと長音符（ー）だけからなる文字列。
 * `Script=Hiragana` には分解表現の濁点・半濁点（U+3099・U+309A）が含まれないため、
 * 検査の前に NFC 正規化しておく必要がある。
 */
const TALENT_READING_PATTERN = /^[\p{Script=Hiragana}ー]+$/u

export const talentNameSchema = z
  .string({ message: 'タレント名を入力してください。' })
  .trim()
  .min(1, 'タレント名を入力してください。')

/**
 * タレントの読み仮名（`talents.reading`）。
 * NFC 正規化して前後の空白を取り除き、空欄は `null` にする。
 * 公開サイトのタレント一覧は、この値で五十音順に並べる。
 */
export const talentReadingSchema = z
  .string({ message: TALENT_READING_MESSAGE })
  .nullish()
  .transform((value) => {
    const reading = (value ?? '').normalize('NFC').trim()

    return reading === '' ? null : reading
  })
  .refine(
    (reading) => reading === null || TALENT_READING_PATTERN.test(reading),
    { message: TALENT_READING_MESSAGE },
  )
