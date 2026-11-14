import { describe, expect, it } from 'vitest'
import { mockStorage } from '../../testing/profile-images.js'
import { postgresError, setupSupabase } from '../../testing/supabase.js'
import { removeUnusedProfileImages } from '../cleanup.js'

const supabase = setupSupabase()

const now = Temporal.Instant.from('2024-05-01T12:34:56.789Z')

describe('removeUnusedProfileImages', () => {
  it('lists icons without an owner that are past the grace period', async () => {
    mockStorage(supabase)
    supabase.respond(() => [])

    await expect(
      removeUnusedProfileImages(supabase.supabaseClient, { now }),
    ).resolves.toBe(0)

    expect(supabase.requests).toHaveLength(1)
    expect(supabase.requests[0]).toMatchObject({
      method: 'GET',
      query: {
        created_at: 'lt.2024-05-01T11:34:56Z',
        select: 'id,path,youtube_channels(id),twitch_users(id)',
        twitch_users: 'is.null',
        youtube_channels: 'is.null',
      },
      table: 'profile_images',
    })
  })

  it('deletes unused icons and keeps those that became used again', async () => {
    const storage = mockStorage(supabase)
    supabase.respond(({ method, query }) => {
      if (method === 'GET') {
        return [
          {
            id: 'image-1',
            path: 'youtube/UC1/a.webp',
            twitch_users: null,
            youtube_channels: null,
          },
          {
            id: 'image-2',
            path: 'twitch/100001/a.webp',
            twitch_users: null,
            youtube_channels: null,
          },
        ]
      }

      return query['id'] === 'eq.image-2'
        ? postgresError('23503', 'violates foreign key constraint')
        : []
    })

    await expect(
      removeUnusedProfileImages(supabase.supabaseClient, { now }),
    ).resolves.toBe(1)
    expect(
      supabase
        .written('DELETE', 'profile_images')
        .map(({ query }) => query['id']),
    ).toEqual(['eq.image-1', 'eq.image-2'])
    expect(storage.removed).toEqual([['youtube/UC1/a.webp']])
  })

  it('fails when unused icons cannot be listed', async () => {
    supabase.respond(() => postgresError('57014', 'canceling statement'))

    await expect(
      removeUnusedProfileImages(supabase.supabaseClient, { now }),
    ).rejects.toThrow('Failed to list unused profile images')
  })
})
