import type * as z from 'zod'
import type { FormState } from '@/components/form'

export type ParseFormDataResult<T> =
  | { data: T; success: true }
  | { state: FormState; success: false }

const INDEXED_KEY_PATTERN = /^(.+)\[(\d+)\]$/

/**
 * zod の検証エラーを、項目ごとのエラーの `FormState` に直す
 */
export function zodErrorToFormState(error: z.ZodError): FormState {
  return error.issues.reduce<FormState>(
    ({ errors: previousErrors = {} }, issue) => {
      const name = issue.path.join('.')
      const previousMessages = previousErrors[name] ?? []

      return {
        errors: {
          ...previousErrors,
          [name]: [...previousMessages, issue.message],
        },
      }
    },
    {},
  )
}

/**
 * `FormData` をオブジェクトに直す。`readings[0]`、`readings[1]` のような
 * `名前[添字]` の形のキーは、添字の順に並べた `名前` の配列にまとめる。
 */
function formDataToObject(formData: FormData): Record<string, unknown> {
  const values = new Map<string, FormDataEntryValue>()
  const indexedValues = new Map<string, [number, FormDataEntryValue][]>()

  for (const [key, value] of formData.entries()) {
    const match = INDEXED_KEY_PATTERN.exec(key)

    if (match) {
      const [, name = key, index = '0'] = match
      const entries = indexedValues.get(name) ?? []

      entries.push([Number(index), value])
      indexedValues.set(name, entries)
    } else if (!values.has(key)) {
      // `FormData.prototype.get()` と同じく、最初の値を使う
      values.set(key, value)
    }
  }

  return Object.fromEntries([
    ...values,
    ...[...indexedValues].map(([name, entries]) => [
      name,
      entries.sort(([a], [b]) => a - b).map(([, value]) => value),
    ]),
  ])
}

/**
 * `FormData` をスキーマで検証する。失敗したときは、そのまま返せる
 * `FormState` を `state` に入れて返す。
 */
export function parseFormData<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): ParseFormDataResult<z.output<T>> {
  const result = schema.safeParse(formDataToObject(formData))

  if (!result.success) {
    return { state: zodErrorToFormState(result.error), success: false }
  }

  return { data: result.data, success: true }
}
