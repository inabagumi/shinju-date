import type { ApiClient } from '@twurple/api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUsers, resolveTwitchUser } from './users.js'

const getUserById = vi.fn()
const getUserByName = vi.fn()
const getUsersByIds = vi.fn()
const getUsersByNames = vi.fn()
const client = {
  users: { getUserById, getUserByName, getUsersByIds, getUsersByNames },
} as unknown as ApiClient

function helixUser(id: string, name = `user${id}`) {
  return {
    broadcasterType: '',
    creationDate: new Date('2024-01-01T00:00:00Z'),
    description: '',
    displayName: name,
    id,
    name,
    offlinePlaceholderUrl: '',
    profilePictureUrl: `https://example.com/${id}.png`,
    type: '',
  }
}

beforeEach(() => {
  getUserById.mockReset()
  getUserByName.mockReset()
  getUsersByIds.mockReset()
  getUsersByNames.mockReset()
})

describe('getUsers', () => {
  it('gets users by ID and then by login', async () => {
    getUsersByIds.mockResolvedValue([helixUser('1')])
    getUsersByNames.mockResolvedValue([helixUser('2', 'bob')])

    const users = await Array.fromAsync(
      getUsers({ client, ids: ['1'], logins: ['bob'] }),
    )

    expect(users).toEqual([
      expect.objectContaining({
        created_at: '2024-01-01T00:00:00Z',
        id: '1',
        login: 'user1',
        profile_image_url: 'https://example.com/1.png',
      }),
      expect.objectContaining({ id: '2', login: 'bob' }),
    ])
    expect(getUsersByIds).toHaveBeenCalledWith(['1'])
    expect(getUsersByNames).toHaveBeenCalledWith(['bob'])
  })

  it('requests nothing without IDs or logins', async () => {
    await expect(Array.fromAsync(getUsers({ client }))).resolves.toEqual([])
    expect(getUsersByIds).not.toHaveBeenCalled()
    expect(getUsersByNames).not.toHaveBeenCalled()
  })
})

describe('resolveTwitchUser', () => {
  it('looks up a user by ID', async () => {
    getUserById.mockResolvedValue(helixUser('1'))

    await expect(
      resolveTwitchUser({ id: '1', kind: 'id' }, { client }),
    ).resolves.toMatchObject({ id: '1' })
    expect(getUserById).toHaveBeenCalledWith('1')
  })

  it('looks up a user by its lowercased login', async () => {
    getUserByName.mockResolvedValue(helixUser('2', 'bob'))

    await expect(
      resolveTwitchUser({ kind: 'login', login: 'Bob' }, { client }),
    ).resolves.toMatchObject({ id: '2', login: 'bob' })
    expect(getUserByName).toHaveBeenCalledWith('bob')
  })

  it('returns null for a user that does not exist', async () => {
    getUserById.mockResolvedValue(null)

    await expect(
      resolveTwitchUser({ id: '404', kind: 'id' }, { client }),
    ).resolves.toBeNull()
  })
})
