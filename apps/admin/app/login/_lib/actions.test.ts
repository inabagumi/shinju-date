import { beforeEach, describe, expect, it, vi } from 'vitest'

const { redirectMock, signInWithPasswordMock, signOutMock } = vi.hoisted(
  () => ({
    redirectMock: vi.fn(),
    signInWithPasswordMock: vi.fn(),
    signOutMock: vi.fn(),
  }),
)

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
    },
  }),
}))

import { signIn } from './actions'

function createFormData(next?: string): FormData {
  const formData = new FormData()
  formData.set('email', 'user@example.com')
  formData.set('password', 'password123')

  if (next !== undefined) {
    formData.set('next', next)
  }

  return formData
}

describe('signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signOutMock.mockResolvedValue({ error: null })
  })

  it('redirects to the dashboard when an admin signs in', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: { app_metadata: { role: 'admin' }, id: 'admin-id' } },
      error: null,
    })

    await signIn({}, createFormData())

    expect(redirectMock).toHaveBeenCalledWith('/')
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('redirects to the requested page after signing in', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: { app_metadata: { role: 'admin' }, id: 'admin-id' } },
      error: null,
    })

    await signIn({}, createFormData('/analytics/click?from=2025-11-01'))

    expect(redirectMock).toHaveBeenCalledWith(
      '/analytics/click?from=2025-11-01',
    )
  })

  it.each(['https://example.com/', '//example.com', '/.//example.com', '/.//'])(
    'redirects to the dashboard instead of the external URL %s',
    async (next) => {
      signInWithPasswordMock.mockResolvedValue({
        data: { user: { app_metadata: { role: 'admin' }, id: 'admin-id' } },
        error: null,
      })

      await signIn({}, createFormData(next))

      expect(redirectMock).toHaveBeenCalledWith('/')
    },
  )

  it('signs out and returns an error when the user is not an admin', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: { app_metadata: { provider: 'email' }, id: 'user-id' } },
      error: null,
    })

    const result = await signIn({}, createFormData())

    expect(result).toEqual({
      errors: {
        generic: ['このアカウントには管理画面を利用する権限がありません。'],
      },
    })
    expect(signOutMock).toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('returns an error when the credentials are wrong', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid login credentials'),
    })

    const result = await signIn({}, createFormData())

    expect(result).toEqual({
      errors: {
        generic: ['メールアドレスかパスワードが正しくありません。'],
      },
    })
    expect(signOutMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('returns the errors for each field when the values are invalid', async () => {
    const formData = new FormData()
    formData.set('email', 'invalid')
    formData.set('password', 'short')

    const result = await signIn({}, formData)

    expect(result).toEqual({
      errors: {
        email: ['メールアドレスの形式が正しくありません。'],
        password: ['パスワードは8文字以上入力する必要があります。'],
      },
    })
    expect(signInWithPasswordMock).not.toHaveBeenCalled()
  })

  it('returns the errors for each field when the values are missing', async () => {
    const result = await signIn({}, new FormData())

    expect(result).toEqual({
      errors: {
        email: ['メールアドレスは必須です。'],
        password: ['パスワードは必須です。'],
      },
    })
    expect(signInWithPasswordMock).not.toHaveBeenCalled()
  })
})
