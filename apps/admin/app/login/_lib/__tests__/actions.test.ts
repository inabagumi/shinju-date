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

import { signIn } from '../actions'

function createFormData(): FormData {
  const formData = new FormData()
  formData.set('email', 'user@example.com')
  formData.set('password', 'password123')

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
})
