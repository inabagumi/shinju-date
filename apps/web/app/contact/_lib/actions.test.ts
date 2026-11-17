import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const DEFAULT_ADMIN_EMAIL = 'contact@example.org'

const { sendEmail, serverEnv } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  serverEnv: {
    ADMIN_EMAIL: 'contact@example.org' as string | undefined,
    FROM_EMAIL: 'noreply@example.org',
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

import { submitContactForm } from './actions'

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData()

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }

  return formData
}

const SUBMITTED_VALUES = {
  email: 'hanako@example.com',
  message: '不具合があります',
  name: '山田花子',
  type: 'bug',
  wantsReply: 'on',
}

describe('submitContactForm', () => {
  beforeEach(() => {
    sendEmail.mockReset()
  })

  afterEach(() => {
    serverEnv.ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL
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

  test.each([
    ['not set', undefined],
    ['the sample value', 'admin@example.com'],
  ])(
    'does not send the email when ADMIN_EMAIL is %s',
    async (_, adminEmail) => {
      serverEnv.ADMIN_EMAIL = adminEmail

      const result = await submitContactForm(
        null,
        createFormData(SUBMITTED_VALUES),
      )

      expect(result).toEqual({
        error: 'お問い合わせ機能は現在ご利用いただけません。',
        success: false,
        values: SUBMITTED_VALUES,
      })
      expect(sendEmail).not.toHaveBeenCalled()
    },
  )

  test('reports success when the email is sent', async () => {
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
        from: 'noreply@example.org',
        replyTo: '山田花子 <hanako@example.com>',
        text: expect.stringContaining('■ お名前\n山田花子\n'),
        to: 'contact@example.org',
      }),
    )
  })

  test('includes the name in the body when no reply is requested', async () => {
    sendEmail.mockResolvedValue({
      data: { id: 'email-id' },
      error: null,
      headers: null,
    })

    const result = await submitContactForm(
      null,
      createFormData({
        message: '不具合があります',
        name: '山田花子',
        type: 'bug',
      }),
    )

    expect(result.success).toBe(true)

    const [options] = sendEmail.mock.calls[0] ?? []

    expect(options).not.toHaveProperty('replyTo')
    expect(options.text).toContain('■ お名前\n山田花子\n')
  })

  test('marks the name as not entered when it is empty', async () => {
    sendEmail.mockResolvedValue({
      data: { id: 'email-id' },
      error: null,
      headers: null,
    })

    await submitContactForm(
      null,
      createFormData({ message: '不具合があります', name: '', type: 'bug' }),
    )

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('■ お名前\n（未入力）\n'),
      }),
    )
  })

  test('reports a failure when Resend returns an error', async () => {
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
