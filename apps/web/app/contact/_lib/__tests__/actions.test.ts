import { describe, expect, test, vi } from 'vitest'

vi.mock('botid/server', () => ({
  checkBotId: vi.fn().mockResolvedValue({ isBot: false }),
}))

vi.mock('../utils', () => ({
  isContactFormEnabled: () => true,
}))

import { submitContactForm } from '../actions'

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData()

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }

  return formData
}

describe('submitContactForm', () => {
  test('returns field errors matching the labels for empty required fields', async () => {
    const result = await submitContactForm(
      null,
      createFormData({ message: '', type: '' }),
    )

    expect(result).toEqual({
      fieldErrors: {
        message: 'お問い合わせ内容を入力してください',
        type: 'お問い合わせ種別を選択してください',
      },
      success: false,
    })
  })

  test('returns a field error for an invalid email address', async () => {
    const result = await submitContactForm(
      null,
      createFormData({
        email: 'invalid',
        message: '不具合があります',
        type: 'bug',
        wantsReply: 'on',
      }),
    )

    expect(result.success).toBe(false)
    expect(result.fieldErrors?.email).toBe(
      'メールアドレスの形式が正しくありません',
    )
  })

  test('requires an email address when a reply is requested', async () => {
    const result = await submitContactForm(
      null,
      createFormData({
        message: '不具合があります',
        type: 'bug',
        wantsReply: 'on',
      }),
    )

    expect(result.success).toBe(false)
    expect(result.fieldErrors?.email).toBe(
      '返信を希望する場合はメールアドレスが必須です',
    )
  })
})
