import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseServerClientMock, getUserMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  getUserMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}))

import {
  requireAuthenticatedUser,
  UNAUTHENTICATED_ERROR_MESSAGE,
  unauthenticatedFormState,
  unauthenticatedResult,
} from './auth'

describe('requireAuthenticatedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: getUserMock },
    })
  })

  it('returns the user and Supabase client when authenticated', async () => {
    const user = {
      app_metadata: { provider: 'email', role: 'admin' },
      email: 'admin@example.com',
      id: 'user-id',
    }
    getUserMock.mockResolvedValue({ data: { user }, error: null })

    const result = await requireAuthenticatedUser()

    expect(result).not.toBeNull()
    expect(result?.user).toBe(user)
    expect(result?.supabaseClient.auth.getUser).toBe(getUserMock)
  })

  it('returns null when the user does not have the admin role', async () => {
    const user = {
      app_metadata: { provider: 'email' },
      email: 'someone@example.com',
      id: 'user-id',
    }
    getUserMock.mockResolvedValue({ data: { user }, error: null })

    await expect(requireAuthenticatedUser()).resolves.toBeNull()
  })

  it('returns null when getUser returns an error', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth session missing!'),
    })

    await expect(requireAuthenticatedUser()).resolves.toBeNull()
  })

  it('returns null when there is no user', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireAuthenticatedUser()).resolves.toBeNull()
  })

  it('returns null when the Supabase client cannot be created', async () => {
    createSupabaseServerClientMock.mockRejectedValue(
      new TypeError('Supabase URL and key are required.'),
    )

    await expect(requireAuthenticatedUser()).resolves.toBeNull()
  })

  it('returns null when getUser throws', async () => {
    getUserMock.mockRejectedValue(new Error('network error'))

    await expect(requireAuthenticatedUser()).resolves.toBeNull()
  })
})

describe('unauthenticated responses', () => {
  it('builds a failed result for success/error style actions', () => {
    expect(unauthenticatedResult()).toEqual({
      error: UNAUTHENTICATED_ERROR_MESSAGE,
      success: false,
    })
  })

  it('builds a FormState with a generic error for form actions', () => {
    expect(unauthenticatedFormState()).toEqual({
      errors: {
        generic: [UNAUTHENTICATED_ERROR_MESSAGE],
      },
    })
  })
})
