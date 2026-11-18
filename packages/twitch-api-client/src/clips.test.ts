import type { ApiClient } from '@twurple/api'
import { describe, expect, it, vi } from 'vitest'
import { getClips } from './clips.js'

describe('getClips', () => {
  it('treats a 404 for clips as not found', async () => {
    const getClipsByIds = vi.fn().mockRejectedValue(
      Object.assign(new Error('Encountered HTTP status code 404'), {
        statusCode: 404,
      }),
    )
    const client = { clips: { getClipsByIds } } as unknown as ApiClient

    await expect(
      Array.fromAsync(getClips({ client, ids: ['gone'] })),
    ).resolves.toEqual([])
  })
})
