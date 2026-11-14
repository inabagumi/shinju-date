import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncTwitchUserIconSafely } from './twitch-user-icon'

vi.mock('@/lib/supabase/admin', () => ({
  supabaseClient: { kind: 'service-role' },
}))

vi.mock('@shinju-date/logger', () => ({
  logger: { warn: vi.fn() },
}))

vi.mock('@shinju-date/scraper/twitch', () => ({
  syncTwitchUserIcon: vi.fn(),
}))

const user = {
  profile_image_url:
    'https://static-cdn.jtvnw.net/jtv_user_pictures/example-profile_image-300x300.png',
}
const saved = {
  id: 'user-row-1',
  profile_images: null,
  twitch_user_id: '141981764',
}

describe('syncTwitchUserIconSafely', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('syncs the icon with the service role client', async () => {
    const { syncTwitchUserIcon } = await import('@shinju-date/scraper/twitch')
    vi.mocked(syncTwitchUserIcon).mockResolvedValue('created')

    await expect(syncTwitchUserIconSafely(user, saved)).resolves.toBe('created')
    expect(syncTwitchUserIcon).toHaveBeenCalledWith({
      saved,
      supabaseClient: { kind: 'service-role' },
      user,
    })
  })

  it('logs a failure without the error object and returns null', async () => {
    const { logger } = await import('@shinju-date/logger')
    const { syncTwitchUserIcon } = await import('@shinju-date/scraper/twitch')
    const error = Object.assign(new Error('Not Found'), {
      cause: { headers: { authorization: 'Bearer secret' } },
    })
    vi.mocked(syncTwitchUserIcon).mockRejectedValue(error)

    await expect(syncTwitchUserIconSafely(user, saved)).resolves.toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      'Twitchユーザーのアイコンを同期できませんでした',
      {
        errorMessage: 'Not Found',
        errorName: 'Error',
        twitchUserId: saved.twitch_user_id,
      },
    )
  })
})
