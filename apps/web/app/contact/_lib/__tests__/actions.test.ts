import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { sendEmail, serverEnv } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  // The Resend client is created when the module is imported.
  serverEnv: {
    ADMIN_EMAIL: undefined as string | undefined,
    RESEND_API_KEY: 're_test',
  },
}))

vi.mock('@/lib/env', () => ({ serverEnv }))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendEmail }
  },
}))

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

const SUBMITTED_VALUES = {
  email: 'haneru@example.com',
  message: '不具合があります',
  name: '因幡はねる',
  type: 'bug',
  wantsReply: 'on',
}

describe('submitContactForm', () => {
  beforeEach(() => {
    sendEmail.mockReset()
  })

  afterEach(() => {
    serverEnv.ADMIN_EMAIL = undefined
    vi.restoreAllMocks()
  })

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
      values: { message: '', type: '' },
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

  test('returns the submitted values when the email cannot be sent', async () => {
    serverEnv.ADMIN_EMAIL = undefined

    const result = await submitContactForm(
      null,
      createFormData(SUBMITTED_VALUES),
    )

    expect(result).toEqual({
      error: 'メール送信設定が完了していません。',
      success: false,
      values: SUBMITTED_VALUES,
    })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  test('reports success when the email is sent', async () => {
    serverEnv.ADMIN_EMAIL = 'contact@shinju.date'
    sendEmail.mockResolvedValue({
      data: { id: 'email-id' },
      error: null,
      headers: null,
    })

    const result = await submitContactForm(
      null,
      createFormData(SUBMITTED_VALUES),
    )

    expect(result).toEqual({
      message: 'お問い合わせを受け付けました。ありがとうございます。',
      success: true,
    })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: '因幡はねる <haneru@example.com>',
        to: 'contact@shinju.date',
      }),
    )
  })

  test('reports a failure when Resend returns an error', async () => {
    serverEnv.ADMIN_EMAIL = 'contact@shinju.date'
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sendError = {
      message: 'Internal server error',
      name: 'internal_server_error',
      statusCode: 500,
    }
    sendEmail.mockResolvedValue({ data: null, error: sendError, headers: null })

    const result = await submitContactForm(
      null,
      createFormData(SUBMITTED_VALUES),
    )

    expect(result).toEqual({
      error:
        '送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
      success: false,
      values: SUBMITTED_VALUES,
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to send contact form email:',
      sendError,
    )
  })
})
