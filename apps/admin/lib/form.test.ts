import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { ActionError } from './action'
import {
  actionErrorToFormState,
  parseFormData,
  zodErrorToFormState,
} from './form'

function createFormData(entries: [string, string][]): FormData {
  const formData = new FormData()

  for (const [key, value] of entries) {
    formData.append(key, value)
  }

  return formData
}

describe('parseFormData', () => {
  const schema = z.object({
    email: z.email({ message: 'メールアドレスの形式が正しくありません。' }),
    password: z
      .string({ message: 'パスワードは必須です。' })
      .min(8, 'パスワードは8文字以上入力する必要があります。'),
  })

  it('returns the parsed data when the values are valid', () => {
    const result = parseFormData(
      schema,
      createFormData([
        ['email', 'user@example.com'],
        ['password', 'password123'],
        ['$ACTION_ID_abc', ''],
      ]),
    )

    expect(result).toEqual({
      data: { email: 'user@example.com', password: 'password123' },
      success: true,
    })
  })

  it('returns the errors for each field when the values are invalid', () => {
    const result = parseFormData(
      schema,
      createFormData([
        ['email', 'invalid'],
        ['password', 'short'],
      ]),
    )

    expect(result).toEqual({
      state: {
        errors: {
          email: ['メールアドレスの形式が正しくありません。'],
          password: ['パスワードは8文字以上入力する必要があります。'],
        },
      },
      success: false,
    })
  })

  it('treats a missing field as undefined', () => {
    const result = parseFormData(
      schema,
      createFormData([['email', 'user@example.com']]),
    )

    expect(result).toEqual({
      state: { errors: { password: ['パスワードは必須です。'] } },
      success: false,
    })
  })

  it('uses the first value when a key appears more than once', () => {
    const result = parseFormData(
      z.object({ name: z.string() }),
      createFormData([
        ['name', 'first'],
        ['name', 'second'],
      ]),
    )

    expect(result).toEqual({ data: { name: 'first' }, success: true })
  })

  it('collects keys of the form name[index] into an array in index order', () => {
    const result = parseFormData(
      z.object({ readings: z.array(z.string()), term: z.string() }),
      createFormData([
        ['term', 'SHINJU DATE'],
        ['readings[1]', 'しんじゅでいと'],
        ['readings[0]', 'シンジュデイト'],
        ['readings[10]', 'shinju date'],
      ]),
    )

    expect(result).toEqual({
      data: {
        readings: ['シンジュデイト', 'しんじゅでいと', 'shinju date'],
        term: 'SHINJU DATE',
      },
      success: true,
    })
  })

  it('reports errors of array items with the index in the name', () => {
    const result = parseFormData(
      z.object({
        readings: z.array(z.string().min(1, '読みを入力してください。')),
      }),
      createFormData([
        ['readings[0]', 'よみ'],
        ['readings[1]', ''],
      ]),
    )

    expect(result).toEqual({
      state: { errors: { 'readings.1': ['読みを入力してください。'] } },
      success: false,
    })
  })
})

describe('zodErrorToFormState', () => {
  it('groups the messages by the path of each issue', () => {
    const schema = z.object({
      password: z
        .string()
        .min(8, '8文字以上入力してください。')
        .regex(/\d/, '数字を含めてください。'),
    })
    const result = schema.safeParse({ password: 'abc' })

    expect(result.success).toBe(false)
    expect(zodErrorToFormState(result.error as z.ZodError)).toEqual({
      errors: {
        password: ['8文字以上入力してください。', '数字を含めてください。'],
      },
    })
  })

  it('reports the errors of hidden fields as generic errors', () => {
    const schema = z.object({
      id: z.guid('有効なIDではありません。'),
      name: z.string().min(1, '名前を入力してください。'),
    })
    const result = schema.safeParse({ id: 'invalid', name: '' })

    expect(result.success).toBe(false)
    expect(
      zodErrorToFormState(result.error as z.ZodError, { hiddenFields: ['id'] }),
    ).toEqual({
      errors: {
        generic: ['有効なIDではありません。'],
        name: ['名前を入力してください。'],
      },
    })
  })

  it('reports the same message of the same field only once', () => {
    const message = '入力が正しくありません。'
    const schema = z.object({
      id: z.guid({ error: message }),
      status: z.enum(['open', 'closed'], { error: message }),
    })
    const result = schema.safeParse({ id: 'invalid', status: 'unknown' })

    expect(result.success).toBe(false)
    expect(
      zodErrorToFormState(result.error as z.ZodError, {
        hiddenFields: ['id', 'status'],
      }),
    ).toEqual({ errors: { generic: [message] } })
  })
})

describe('actionErrorToFormState', () => {
  it('attaches the message to the field of the error', () => {
    expect(
      actionErrorToFormState(
        new ActionError('すでに登録されています。', { field: 'name' }),
      ),
    ).toEqual({ errors: { name: ['すでに登録されています。'] } })
  })

  it('attaches the message to no field when the error has none', () => {
    expect(actionErrorToFormState(new ActionError('失敗しました。'))).toEqual({
      errors: { generic: ['失敗しました。'] },
    })
  })
})
