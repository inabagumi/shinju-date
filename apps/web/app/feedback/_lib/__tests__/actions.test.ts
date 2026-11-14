import { beforeEach, describe, expect, test, vi } from 'vitest'

const { insert } = vi.hoisted(() => ({
  insert: vi.fn(),
}))

vi.mock('botid/server', () => ({
  checkBotId: vi.fn().mockResolvedValue({ isBot: false }),
}))

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    from: () => ({ insert }),
  }),
}))

import { submitFeedback } from '../actions'

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData()

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }

  return formData
}

describe('submitFeedback', () => {
  beforeEach(() => {
    insert.mockReset()
    insert.mockResolvedValue({ error: null })
  })

  test.each([
    ['empty', ''],
    ['whitespace only', '   \n'],
  ])(
    'returns a field error matching the label when the message is %s',
    async (_, message) => {
      const result = await submitFeedback(null, createFormData({ message }))

      expect(result).toEqual({
        fieldErrors: { message: '機能要望を入力してください' },
        success: false,
        values: { message },
      })
      expect(insert).not.toHaveBeenCalled()
    },
  )

  test('returns a field error when the message is missing', async () => {
    const result = await submitFeedback(null, new FormData())

    expect(result.fieldErrors?.message).toBe('機能要望を入力してください')
    expect(insert).not.toHaveBeenCalled()
  })

  test('stores the trimmed message', async () => {
    const result = await submitFeedback(
      null,
      createFormData({ message: '  検索機能がほしい  ' }),
    )

    expect(result.success).toBe(true)
    expect(result.values).toBeUndefined()
    expect(insert).toHaveBeenCalledWith({ message: '検索機能がほしい' })
  })

  test('returns the submitted message when the insert fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    insert.mockResolvedValue({ error: { message: 'insert failed' } })

    const result = await submitFeedback(
      null,
      createFormData({ message: '  検索機能がほしい  ' }),
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.values).toEqual({ message: '  検索機能がほしい  ' })
  })

  test('returns the submitted message when an unexpected error occurs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    insert.mockRejectedValue(new Error('network error'))

    const result = await submitFeedback(
      null,
      createFormData({ message: '検索機能がほしい' }),
    )

    expect(result.success).toBe(false)
    expect(result.values).toEqual({ message: '検索機能がほしい' })
  })
})
