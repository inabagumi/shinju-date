import { notFound, redirect } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'

const { loggerErrorMock, requireAuthenticatedUserMock } = vi.hoisted(() => ({
  loggerErrorMock: vi.fn(),
  requireAuthenticatedUserMock: vi.fn(),
}))

vi.mock('@shinju-date/logger', () => ({
  logger: { error: loggerErrorMock },
}))

vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  requireAuthenticatedUser: requireAuthenticatedUserMock,
}))

import { unauthenticatedFormState, unauthenticatedResult } from '@/lib/auth'
import {
  ACTION_FAILED_ERROR_MESSAGE,
  ActionError,
  adminAction,
  adminFormAction,
} from './action'

const auth = {
  supabaseClient: { from: vi.fn() },
  user: { id: 'user-id' },
}

function formData(entries: Record<string, string>): FormData {
  const data = new FormData()

  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value)
  }

  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  requireAuthenticatedUserMock.mockResolvedValue(auth)
})

describe('ActionError', () => {
  it('keeps the message that may be shown and the field it belongs to', () => {
    const error = new ActionError('すでに登録されています。', {
      field: 'youtube_channel_id',
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ActionError')
    expect(error.message).toBe('すでに登録されています。')
    expect(error.field).toBe('youtube_channel_id')
  })

  it('belongs to no field when none is given', () => {
    expect(new ActionError('失敗しました。').field).toBeUndefined()
  })
})

describe('adminAction', () => {
  it('returns the unauthenticated result without calling the handler', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(null)
    const handler = vi.fn()
    const action = adminAction('testAction', handler)

    await expect(action('id')).resolves.toEqual(unauthenticatedResult())
    expect(handler).not.toHaveBeenCalled()
  })

  it('calls the handler with the context and the arguments and returns its result', async () => {
    const handler = vi.fn(async (_context: unknown, id: string, n: number) => ({
      data: { id, n },
      success: true as const,
      warnings: ['一部を飛ばしました。'],
    }))
    const action = adminAction('testAction', handler)

    await expect(action('id', 1)).resolves.toEqual({
      data: { id: 'id', n: 1 },
      success: true,
      warnings: ['一部を飛ばしました。'],
    })
    expect(handler).toHaveBeenCalledWith(auth, 'id', 1)
  })

  it('returns a failed result from the handler as it is', async () => {
    const action = adminAction('testAction', async () => ({
      error: '見つかりません。',
      success: false as const,
    }))

    await expect(action()).resolves.toEqual({
      error: '見つかりません。',
      success: false,
    })
  })

  it('returns the message of an ActionError', async () => {
    const action = adminAction('testAction', async () => {
      throw new ActionError('すでに登録されています。')
    })

    await expect(action()).resolves.toEqual({
      error: 'すでに登録されています。',
      success: false,
    })
    expect(loggerErrorMock).not.toHaveBeenCalled()
  })

  it('logs any other error and returns a fixed message instead of its message', async () => {
    const error = new Error('duplicate key value violates unique constraint')
    const action = adminAction('testAction', async (_context, _id: string) => {
      throw error
    })

    const result = await action('id')

    expect(result).toEqual({
      error: ACTION_FAILED_ERROR_MESSAGE,
      success: false,
    })
    expect(JSON.stringify(result)).not.toContain('duplicate key')
    expect(loggerErrorMock).toHaveBeenCalledWith(expect.any(String), {
      action: 'testAction',
      args: ['id'],
      error,
    })
  })

  it('rethrows the errors that Next.js handles', async () => {
    const action = adminAction('testAction', async () => {
      redirect('/talents')
    })

    await expect(action()).rejects.toThrow('NEXT_REDIRECT')
    expect(loggerErrorMock).not.toHaveBeenCalled()
  })
})

describe('adminFormAction', () => {
  const schema = z.object({
    name: z.string().min(1, '名前を入力してください。'),
  })

  it('returns the unauthenticated state without calling the handler', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(null)
    const handler = vi.fn()
    const action = adminFormAction('testFormAction', schema, handler)

    await expect(action({}, formData({ name: 'name' }))).resolves.toEqual(
      unauthenticatedFormState(),
    )
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns the errors of each field without calling the handler when the validation fails', async () => {
    const handler = vi.fn()
    const action = adminFormAction('testFormAction', schema, handler)

    await expect(action({}, formData({ name: '' }))).resolves.toEqual({
      errors: { name: ['名前を入力してください。'] },
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns the errors of the hidden fields as generic errors', async () => {
    const handler = vi.fn()
    const action = adminFormAction('testFormAction', schema, handler, {
      hiddenFields: ['name'],
    })

    await expect(action({}, formData({ name: '' }))).resolves.toEqual({
      errors: { generic: ['名前を入力してください。'] },
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('calls the handler with the context and the parsed data and returns success', async () => {
    const handler = vi.fn(async () => undefined)
    const action = adminFormAction('testFormAction', schema, handler)

    await expect(action({}, formData({ name: 'name' }))).resolves.toEqual({
      success: true,
    })
    expect(handler).toHaveBeenCalledWith(auth, { name: 'name' })
  })

  it('returns the state that the handler returns', async () => {
    const action = adminFormAction('testFormAction', schema, async () => ({
      errors: { name: ['使えない名前です。'] },
    }))

    await expect(action({}, formData({ name: 'name' }))).resolves.toEqual({
      errors: { name: ['使えない名前です。'] },
    })
  })

  it('returns the message of an ActionError as the error of its field', async () => {
    const action = adminFormAction('testFormAction', schema, async () => {
      throw new ActionError('すでに登録されています。', { field: 'name' })
    })

    await expect(action({}, formData({ name: 'name' }))).resolves.toEqual({
      errors: { name: ['すでに登録されています。'] },
    })
    expect(loggerErrorMock).not.toHaveBeenCalled()
  })

  it('returns the message of an ActionError without a field as a generic error', async () => {
    const action = adminFormAction('testFormAction', schema, async () => {
      throw new ActionError('失敗しました。')
    })

    await expect(action({}, formData({ name: 'name' }))).resolves.toEqual({
      errors: { generic: ['失敗しました。'] },
    })
  })

  it('logs any other error without the form values and returns a fixed message instead of its message', async () => {
    const error = new Error('duplicate key value violates unique constraint')
    const action = adminFormAction('testFormAction', schema, async () => {
      throw error
    })

    const result = await action({}, formData({ name: 'secret' }))

    expect(result).toEqual({ error: ACTION_FAILED_ERROR_MESSAGE })
    expect(JSON.stringify(result)).not.toContain('duplicate key')
    expect(loggerErrorMock).toHaveBeenCalledWith(expect.any(String), {
      action: 'testFormAction',
      error,
    })
  })

  it('rethrows the errors that Next.js handles', async () => {
    const action = adminFormAction('testFormAction', schema, async () => {
      notFound()
    })

    await expect(action({}, formData({ name: 'name' }))).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK',
    )
    expect(loggerErrorMock).not.toHaveBeenCalled()
  })
})
