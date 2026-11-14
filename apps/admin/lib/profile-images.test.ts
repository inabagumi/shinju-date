import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const bucket = { remove: vi.fn() }

  return {
    bucket,
    storageFrom: vi.fn(() => bucket),
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  supabaseClient: {
    storage: { from: mocks.storageFrom },
  },
}))

vi.mock('@shinju-date/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}))

import { logger } from '@shinju-date/logger'
import { removeProfileImageObjects } from './profile-images'

describe('removeProfileImageObjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.bucket.remove.mockResolvedValue({ data: [], error: null })
  })

  it('removes the objects from the profile-images bucket', async () => {
    await removeProfileImageObjects(['youtube/UC1/a.webp', null, undefined])

    expect(mocks.storageFrom).toHaveBeenCalledWith('profile-images')
    expect(mocks.bucket.remove).toHaveBeenCalledWith(['youtube/UC1/a.webp'])
  })

  it('does nothing for accounts without a profile image', async () => {
    await removeProfileImageObjects([null, undefined])

    expect(mocks.bucket.remove).not.toHaveBeenCalled()
  })

  it('only logs failures', async () => {
    mocks.bucket.remove.mockResolvedValue({
      data: null,
      error: new Error('storage unavailable'),
    })

    await expect(
      removeProfileImageObjects(['twitch/1/a.webp']),
    ).resolves.toBeUndefined()
    expect(logger.warn).toHaveBeenCalledWith(
      'プロフィール画像の削除に失敗しました',
      expect.objectContaining({ paths: ['twitch/1/a.webp'] }),
    )
  })
})
