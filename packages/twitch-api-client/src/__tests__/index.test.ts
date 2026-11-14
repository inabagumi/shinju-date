import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getArchivedStreamId,
  getTwitchVideoStatus,
  isLiveTwitchVideoId,
  parseTwitchUserIdentifier,
  resetTwitchClientState,
  streamIdFromLiveTwitchVideoId,
  type TwitchVideo,
  toLiveTwitchVideoId,
} from '../index'

describe('live twitch video id helpers', () => {
  it('builds and detects synthetic live ids', () => {
    expect(toLiveTwitchVideoId('1234567890')).toBe('live:1234567890')
    expect(isLiveTwitchVideoId('live:1234567890')).toBe(true)
    expect(isLiveTwitchVideoId('1234567890')).toBe(false)
    expect(streamIdFromLiveTwitchVideoId('live:1234567890')).toBe('1234567890')
    expect(streamIdFromLiveTwitchVideoId('1234567890')).toBeNull()
  })
})

describe('getTwitchVideoStatus', () => {
  it('treats archives and highlights as ended broadcasts', () => {
    expect(getTwitchVideoStatus('archive')).toBe('ENDED')
    expect(getTwitchVideoStatus('highlight')).toBe('ENDED')
  })

  it('treats uploads and clips as published videos', () => {
    expect(getTwitchVideoStatus('upload')).toBe('PUBLISHED')
    expect(getTwitchVideoStatus('clip')).toBe('PUBLISHED')
  })
})

describe('getArchivedStreamId', () => {
  it('returns the stream ID of an archive', () => {
    expect(
      getArchivedStreamId({
        stream_id: '42',
        type: 'archive',
      } as TwitchVideo),
    ).toBe('42')
  })

  it('returns null for archives without a stream and other videos', () => {
    expect(
      getArchivedStreamId({ stream_id: null, type: 'archive' } as TwitchVideo),
    ).toBeNull()
    expect(
      getArchivedStreamId({
        stream_id: '42',
        type: 'highlight',
      } as TwitchVideo),
    ).toBeNull()
    expect(
      getArchivedStreamId({ stream_id: '42', type: 'upload' } as TwitchVideo),
    ).toBeNull()
  })
})

describe('parseTwitchUserIdentifier', () => {
  it('parses login names', () => {
    expect(parseTwitchUserIdentifier('example_user')).toEqual({
      kind: 'login',
      login: 'example_user',
    })
    expect(parseTwitchUserIdentifier('Example_User')).toEqual({
      kind: 'login',
      login: 'example_user',
    })
    expect(parseTwitchUserIdentifier('@streamer')).toEqual({
      kind: 'login',
      login: 'streamer',
    })
  })

  it('parses numeric user IDs', () => {
    expect(parseTwitchUserIdentifier('123456789')).toEqual({
      id: '123456789',
      kind: 'id',
    })
  })

  it('parses Twitch channel URLs', () => {
    expect(
      parseTwitchUserIdentifier('https://www.twitch.tv/example_user'),
    ).toEqual({
      kind: 'login',
      login: 'example_user',
    })
    expect(
      parseTwitchUserIdentifier('https://twitch.tv/example_user/about'),
    ).toEqual({
      kind: 'login',
      login: 'example_user',
    })
    expect(parseTwitchUserIdentifier('www.twitch.tv/foo_bar')).toEqual({
      kind: 'login',
      login: 'foo_bar',
    })
  })

  it('returns null for invalid input', () => {
    expect(parseTwitchUserIdentifier('')).toBeNull()
    expect(parseTwitchUserIdentifier('ab')).toBeNull()
    expect(
      parseTwitchUserIdentifier('https://www.twitch.tv/directory'),
    ).toBeNull()
    expect(parseTwitchUserIdentifier('not a valid!!')).toBeNull()
  })
})

describe('getTwitchCredentials', () => {
  beforeEach(() => {
    resetTwitchClientState()
  })

  afterEach(() => {
    resetTwitchClientState()
    vi.unstubAllEnvs()
  })

  it('throws when credentials are missing', async () => {
    vi.stubEnv('TWITCH_CLIENT_ID', '')
    vi.stubEnv('TWITCH_CLIENT_SECRET', '')
    delete process.env['TWITCH_CLIENT_ID']
    delete process.env['TWITCH_CLIENT_SECRET']

    const { getTwitchCredentials } = await import('../index')
    expect(() => getTwitchCredentials()).toThrow(/Client ID and Client Secret/)
  })

  it('reads credentials from the environment', async () => {
    vi.stubEnv('TWITCH_CLIENT_ID', 'test-client-id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'test-client-secret')

    const { getTwitchCredentials } = await import('../index')
    expect(getTwitchCredentials()).toEqual({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })
  })
})

describe('lookups by ID', () => {
  const getVideosByIds = vi.fn()
  const getVideosByUser = vi.fn()
  const getClipsByIds = vi.fn()

  function notFound(): Error {
    return Object.assign(new Error('Encountered HTTP status code 404'), {
      statusCode: 404,
    })
  }

  function helixVideo(id: string) {
    return {
      creationDate: new Date('2024-01-01T00:00:00Z'),
      description: '',
      durationInSeconds: 3723,
      id,
      isPublic: true,
      language: 'ja',
      publishDate: new Date('2024-01-01T00:00:00Z'),
      streamId: null,
      thumbnailUrl: 'https://example.com/%{width}x%{height}.jpg',
      title: `Video ${id}`,
      type: 'archive',
      url: `https://www.twitch.tv/videos/${id}`,
      userDisplayName: 'Alice',
      userId: 'user-1',
      userName: 'alice',
      views: 1,
    }
  }

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('TWITCH_CLIENT_ID', 'test-client-id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'test-client-secret')
    getVideosByIds.mockReset()
    getVideosByUser.mockReset()
    getClipsByIds.mockReset()

    vi.doMock('@twurple/auth', () => ({
      AppTokenAuthProvider: class {},
    }))
    vi.doMock('@twurple/api', () => ({
      ApiClient: class {
        clips = { getClipsByIds }
        videos = { getVideosByIds, getVideosByUser }
      },
    }))
  })

  afterEach(() => {
    vi.doUnmock('@twurple/api')
    vi.doUnmock('@twurple/auth')
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('maps videos Helix returns', async () => {
    getVideosByIds.mockResolvedValue([helixVideo('1')])

    const { getVideos } = await import('../index')
    const videos = await Array.fromAsync(getVideos({ ids: ['1'] }))

    expect(videos).toHaveLength(1)
    expect(videos[0]).toMatchObject({
      duration: 'PT1H2M3S',
      id: '1',
      published_at: '2024-01-01T00:00:00Z',
      type: 'archive',
    })
  })

  it('treats a 404 for a single video as not found', async () => {
    getVideosByIds.mockRejectedValue(notFound())

    const { getVideos } = await import('../index')

    await expect(
      Array.fromAsync(getVideos({ ids: ['gone'] })),
    ).resolves.toEqual([])
  })

  it('still returns existing videos when a batch answers 404', async () => {
    getVideosByIds.mockImplementation(async (ids: string[]) => {
      if (ids.includes('gone')) {
        throw notFound()
      }

      return ids.map(helixVideo)
    })

    const { getVideos } = await import('../index')
    const videos = await Array.fromAsync(
      getVideos({ ids: ['1', '2', 'gone', '3', '4'] }),
    )

    expect(videos.map((video) => video.id)).toEqual(['1', '2', '3', '4'])
  })

  it('rethrows errors other than 404', async () => {
    getVideosByIds.mockRejectedValue(
      Object.assign(new Error('Encountered HTTP status code 500'), {
        statusCode: 500,
      }),
    )

    const { getVideos } = await import('../index')

    await expect(Array.fromAsync(getVideos({ ids: ['1'] }))).rejects.toThrow(
      /500/,
    )
  })

  it('treats a 404 for clips as not found', async () => {
    getClipsByIds.mockRejectedValue(notFound())

    const { getClips } = await import('../index')

    await expect(Array.fromAsync(getClips({ ids: ['gone'] }))).resolves.toEqual(
      [],
    )
  })

  it('returns one page of a broadcaster with the cursor of the next', async () => {
    getVideosByUser.mockResolvedValue({
      cursor: 'next',
      data: [helixVideo('1'), helixVideo('2')],
    })

    const { getVideosByUserPage } = await import('../index.js')
    const page = await getVideosByUserPage({
      after: 'current',
      type: 'all',
      userId: 'user-1',
    })

    expect(getVideosByUser).toHaveBeenCalledWith('user-1', {
      after: 'current',
      limit: 100,
      type: 'all',
    })
    expect(page.cursor).toBe('next')
    expect(page.videos.map((video) => video.id)).toEqual(['1', '2'])
  })

  it('ends the walk at an empty page even when Helix returns a cursor', async () => {
    getVideosByUser.mockResolvedValue({ cursor: 'stale', data: [] })

    const { getVideosByUserPage } = await import('../index.js')

    await expect(getVideosByUserPage({ userId: 'user-1' })).resolves.toEqual({
      cursor: null,
      videos: [],
    })
    expect(getVideosByUser).toHaveBeenCalledWith('user-1', {
      limit: 100,
      type: 'archive',
    })
  })
})

describe('broadcast lookups', () => {
  const getStreamsByUserIds = vi.fn()
  const getVideosByUser = vi.fn()

  function helixStream(id: string, userId = 'user-1') {
    return {
      gameId: '1',
      gameName: 'Just Chatting',
      id,
      isMature: false,
      language: 'ja',
      startDate: new Date('2024-01-01T00:00:00Z'),
      tags: [],
      thumbnailUrl: 'https://example.com/{width}x{height}.jpg',
      title: `Stream ${id}`,
      type: 'live',
      userDisplayName: 'Alice',
      userId,
      userName: 'alice',
      viewers: 10,
    }
  }

  function helixArchive(id: string, streamId: string | null) {
    return {
      creationDate: new Date('2024-01-01T00:00:00Z'),
      description: '',
      durationInSeconds: 3600,
      id,
      isPublic: true,
      language: 'ja',
      publishDate: new Date('2024-01-01T00:00:00Z'),
      streamId,
      thumbnailUrl: '',
      title: `Archive ${id}`,
      type: 'archive',
      url: `https://www.twitch.tv/videos/${id}`,
      userDisplayName: 'Alice',
      userId: 'user-1',
      userName: 'alice',
      views: 1,
    }
  }

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('TWITCH_CLIENT_ID', 'test-client-id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'test-client-secret')
    getStreamsByUserIds.mockReset()
    getVideosByUser.mockReset()

    vi.doMock('@twurple/auth', () => ({
      AppTokenAuthProvider: class {},
    }))
    vi.doMock('@twurple/api', () => ({
      ApiClient: class {
        streams = { getStreamsByUserIds }
        videos = { getVideosByUser }
      },
    }))
  })

  afterEach(() => {
    vi.doUnmock('@twurple/api')
    vi.doUnmock('@twurple/auth')
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns the stream while the broadcast is on air', async () => {
    getStreamsByUserIds.mockResolvedValue([helixStream('42')])

    const { getLiveStream } = await import('../index')

    await expect(
      getLiveStream({ streamId: '42', userId: 'user-1' }),
    ).resolves.toMatchObject({ id: '42', title: 'Stream 42' })
    expect(getStreamsByUserIds).toHaveBeenCalledWith(['user-1'])
  })

  it('returns null once the broadcaster went offline or started another stream', async () => {
    getStreamsByUserIds.mockResolvedValueOnce([])
    getStreamsByUserIds.mockResolvedValueOnce([helixStream('43')])

    const { getLiveStream } = await import('../index')

    await expect(
      getLiveStream({ streamId: '42', userId: 'user-1' }),
    ).resolves.toBeNull()
    await expect(
      getLiveStream({ streamId: '42', userId: 'user-1' }),
    ).resolves.toBeNull()
  })

  it('finds the archive of a broadcast by its stream ID', async () => {
    getVideosByUser.mockResolvedValue({
      data: [helixArchive('900', '41'), helixArchive('901', '42')],
    })

    const { getArchiveOfStream } = await import('../index')

    await expect(
      getArchiveOfStream({ streamId: '42', userId: 'user-1' }),
    ).resolves.toMatchObject({ id: '901', stream_id: '42' })
    expect(getVideosByUser).toHaveBeenCalledWith('user-1', {
      limit: 100,
      type: 'archive',
    })
  })

  it('returns null when Twitch keeps no archive of the broadcast', async () => {
    getVideosByUser.mockResolvedValue({
      data: [helixArchive('900', '41'), helixArchive('902', null)],
    })

    const { getArchiveOfStream } = await import('../index')

    await expect(
      getArchiveOfStream({ streamId: '42', userId: 'user-1' }),
    ).resolves.toBeNull()
  })
})
