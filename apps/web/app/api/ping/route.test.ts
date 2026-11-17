// @vitest-environment node
import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>

interface Filter {
  column: string
  operator: 'eq' | 'ilike' | 'in'
  value: unknown
}

const mocks = vi.hoisted(() => ({
  pipeline: {
    exec: vi.fn(),
    expire: vi.fn(),
    zincrby: vi.fn(),
  },
  tables: {} as Record<string, Row[]>,
  track: vi.fn(),
}))

/** Reads a column, following `.` into embedded resources. */
function getColumn(row: Row, column: string): unknown {
  return column
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value != null && typeof value === 'object'
          ? (value as Row)[key]
          : undefined,
      row,
    )
}

/** Whether a value matches an `ilike` pattern, as PostgreSQL reads it. */
function matchesPattern(value: unknown, pattern: string): boolean {
  const source = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.')

  return typeof value === 'string' && new RegExp(`^${source}$`, 'i').test(value)
}

function matches(row: Row, { column, operator, value }: Filter): boolean {
  const actual = getColumn(row, column)

  switch (operator) {
    case 'eq':
      return actual != null && actual === value
    case 'ilike':
      return matchesPattern(actual, value as string)
    case 'in':
      return (value as unknown[]).includes(actual)
  }
}

/**
 * A query builder of supabase-js on the rows of `mocks.tables`. The rows are
 * returned as they are, whatever is selected.
 */
function createQuery(table: string) {
  const filters: Filter[] = []
  let order: { ascending: boolean; column: string } | undefined
  let limit: number | undefined

  function rows(): Row[] {
    const result = (mocks.tables[table] ?? []).filter((row) =>
      filters.every((filter) => matches(row, filter)),
    )

    if (order) {
      const { ascending, column } = order

      result.sort((a, b) => {
        const compared = String(getColumn(a, column)).localeCompare(
          String(getColumn(b, column)),
        )

        return ascending ? compared : -compared
      })
    }

    return limit === undefined ? result : result.slice(0, limit)
  }

  const query = {
    eq(column: string, value: unknown) {
      filters.push({ column, operator: 'eq', value })
      return query
    },
    ilike(column: string, value: string) {
      filters.push({ column, operator: 'ilike', value })
      return query
    },
    in(column: string, value: unknown[]) {
      filters.push({ column, operator: 'in', value })
      return query
    },
    limit(count: number) {
      limit = count
      return query
    },
    async maybeSingle() {
      const result = rows()

      return result.length > 1
        ? {
            data: null,
            error: { code: 'PGRST116', message: 'multiple rows returned' },
          }
        : { data: result[0] ?? null, error: null }
    },
    order(column: string, { ascending = true } = {}) {
      order = { ascending, column }
      return query
    },
    select() {
      return query
    },
    async single() {
      const result = rows()

      return result.length === 1
        ? { data: result[0], error: null }
        : {
            data: null,
            error: {
              code: 'PGRST116',
              message: `${result.length} rows returned`,
            },
          }
    },
    // biome-ignore lint/suspicious/noThenProperty: supabase-js query builders are awaited directly
    then<T>(
      onFulfilled: (value: { data: Row[]; error: null }) => T,
      onRejected?: (reason: unknown) => T,
    ) {
      return Promise.resolve({ data: rows(), error: null }).then(
        onFulfilled,
        onRejected,
      )
    },
  }

  return query
}

vi.mock('@/lib/supabase', () => ({
  supabaseClient: { from: createQuery },
}))

vi.mock('@/lib/redis', () => ({
  getRedisClient: () => ({ multi: () => mocks.pipeline }),
}))

vi.mock('@vercel/analytics/server', () => ({
  track: mocks.track,
}))

vi.mock('@sentry/nextjs', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}))

import { POST } from './route'

const talentA = { id: 'talent-a', name: 'Talent A' }
const talentB = { id: 'talent-b', name: 'Talent B' }

function youtubeVideo(id: string, youtubeVideoId: string): Row {
  return {
    id,
    platform: 'youtube',
    published_at: '2026-11-16T12:00:00Z',
    status: 'ENDED',
    talent: talentA,
    title: `Video ${id}`,
    twitch_video: null,
    youtube_video: { youtube_video_id: youtubeVideoId },
  }
}

interface TwitchVideoOptions {
  login: string
  publishedAt?: string
  status?: string
  talent?: Row
  twitchVideoId: string
  twitchUserId: string
  type?: string
}

function twitchVideo(
  id: string,
  {
    login,
    publishedAt = '2026-11-16T12:00:00Z',
    status = 'ENDED',
    talent = talentA,
    twitchUserId,
    twitchVideoId,
    type = 'archive',
  }: TwitchVideoOptions,
): Row {
  return {
    id,
    platform: 'twitch',
    published_at: publishedAt,
    status,
    talent,
    title: `Video ${id}`,
    twitch_user_id: twitchUserId,
    twitch_video: {
      twitch_user: { twitch_login_name: login },
      twitch_video_id: twitchVideoId,
      type,
    },
    youtube_video: null,
  }
}

/** Saves the videos with the `twitch_videos` rows that link them to users. */
function saveVideos(videos: Row[]): void {
  mocks.tables['videos'] = videos
  mocks.tables['twitch_videos'] = videos
    .filter((video) => video['platform'] === 'twitch')
    .map((video) => ({
      twitch_user_id: video['twitch_user_id'],
      video_id: video['id'],
    }))
}

/** The videos saved before each test. */
function savedVideos(): Row[] {
  return [
    youtubeVideo('video-yt', 'ytvid1'),
    twitchVideo('video-vod', {
      login: 'foo_bar',
      twitchUserId: 'user-foo-bar',
      twitchVideoId: '2000000001',
    }),
    twitchVideo('video-clip', {
      login: 'foo_bar',
      twitchUserId: 'user-foo-bar',
      twitchVideoId: 'FunnyClipSlug',
      type: 'clip',
    }),
    twitchVideo('video-other', {
      login: 'fooxbar',
      talent: talentB,
      twitchUserId: 'user-fooxbar',
      twitchVideoId: '2000000002',
    }),
  ]
}

function ping(url: string): Promise<Response> {
  return POST(
    new Request('https://shinju.date/api/ping', {
      body: 'PING',
      headers: {
        'Content-Type': 'text/ping',
        'Ping-From': 'https://shinju.date/',
        'Ping-To': url,
        'User-Agent': 'Mozilla/5.0',
        'X-Forwarded-For': '192.0.2.1',
      },
      method: 'POST',
    }),
  )
}

/** The ID of the video whose click was counted, if any. */
function countedVideoId(): unknown {
  return mocks.pipeline.zincrby.mock.calls.find(([key]) =>
    String(key).startsWith(REDIS_KEYS.CLICK_VIDEO_PREFIX),
  )?.[2]
}

describe('POST /api/ping', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.tables = {
      twitch_users: [
        { id: 'user-foo-bar', twitch_login_name: 'foo_bar' },
        { id: 'user-fooxbar', twitch_login_name: 'fooxbar' },
        { id: 'user-no-login', twitch_login_name: null },
      ],
    }
    saveVideos(savedVideos())
  })

  describe('YouTube', () => {
    it.each([
      'https://www.youtube.com/watch?v=ytvid1',
      'https://youtube.com/watch?v=ytvid1',
      'https://youtu.be/ytvid1',
      'https://www.youtube.com/live/ytvid1',
    ])('counts a click on %s', async (url) => {
      const response = await ping(url)

      expect(response.status).toBe(204)
      expect(countedVideoId()).toBe('video-yt')
    })

    it.each([
      'https://www.youtube.com/watch',
      'https://youtu.be/',
      'https://www.youtube.com/@channel',
    ])('answers 422 for %s, which names no video', async (url) => {
      const response = await ping(url)

      expect(response.status).toBe(422)
      expect(mocks.pipeline.exec).not.toHaveBeenCalled()
    })

    it('answers 422 for a video that is not saved', async () => {
      const response = await ping('https://www.youtube.com/watch?v=unknown')

      expect(response.status).toBe(422)
      expect(mocks.pipeline.exec).not.toHaveBeenCalled()
    })
  })

  describe('Twitch', () => {
    it.each([
      ['https://www.twitch.tv/videos/2000000001', 'video-vod'],
      ['https://m.twitch.tv/videos/2000000001', 'video-vod'],
      ['https://clips.twitch.tv/FunnyClipSlug', 'video-clip'],
      ['https://www.twitch.tv/foo_bar/clip/FunnyClipSlug', 'video-clip'],
    ])('counts a click on %s', async (url, videoId) => {
      const response = await ping(url)

      expect(response.status).toBe(204)
      expect(countedVideoId()).toBe(videoId)
    })

    it('counts a click on a channel for the video live there', async () => {
      saveVideos([
        ...savedVideos(),
        twitchVideo('video-live', {
          login: 'foo_bar',
          publishedAt: '2026-11-16T10:00:00Z',
          status: 'LIVE',
          twitchUserId: 'user-foo-bar',
          twitchVideoId: 'live:123',
        }),
      ])

      const response = await ping('https://www.twitch.tv/foo_bar')

      expect(response.status).toBe(204)
      expect(countedVideoId()).toBe('video-live')
    })

    it('counts a click on a channel with no live video for its latest video', async () => {
      saveVideos([
        ...savedVideos(),
        twitchVideo('video-latest', {
          login: 'foo_bar',
          publishedAt: '2026-11-16T15:00:00Z',
          twitchUserId: 'user-foo-bar',
          twitchVideoId: '2000000003',
        }),
      ])

      const response = await ping('https://www.twitch.tv/foo_bar')

      expect(response.status).toBe(204)
      expect(countedVideoId()).toBe('video-latest')
    })

    it('finds the user whose login is exactly the one in the URL, read in lowercase', async () => {
      // `foo_bar` as a pattern would also match `fooxbar`.
      const response = await ping('https://www.twitch.tv/Foo_Bar')

      expect(response.status).toBe(204)
      expect(countedVideoId()).not.toBe('video-other')
    })

    it('does not count a click on a login with `_` for another user', async () => {
      mocks.tables['twitch_users'] = [
        { id: 'user-fooxbar', twitch_login_name: 'fooxbar' },
      ]

      const response = await ping('https://www.twitch.tv/foo_bar')

      expect(response.status).toBe(422)
      expect(mocks.pipeline.exec).not.toHaveBeenCalled()
    })

    it('answers 422 for a channel that is not saved', async () => {
      const response = await ping('https://www.twitch.tv/unknown')

      expect(response.status).toBe(422)
      expect(mocks.pipeline.exec).not.toHaveBeenCalled()
    })

    it('answers 422 for a channel with no videos', async () => {
      mocks.tables['twitch_users'] = [
        { id: 'user-quiet', twitch_login_name: 'quiet' },
      ]

      const response = await ping('https://www.twitch.tv/quiet')

      expect(response.status).toBe(422)
      expect(mocks.pipeline.exec).not.toHaveBeenCalled()
    })

    it.each([
      'https://www.twitch.tv/',
      'https://www.twitch.tv/directory',
      'https://www.twitch.tv/foo_bar/about',
      'https://clips.twitch.tv/',
    ])('answers 422 for %s, which names no video', async (url) => {
      const response = await ping(url)

      expect(response.status).toBe(422)
      expect(mocks.pipeline.exec).not.toHaveBeenCalled()
    })

    it('answers 422 for a video that is not saved', async () => {
      const response = await ping('https://www.twitch.tv/videos/9999999999')

      expect(response.status).toBe(422)
      expect(mocks.pipeline.exec).not.toHaveBeenCalled()
    })
  })

  it('answers 422 for a host it does not know', async () => {
    const response = await ping('https://example.com/watch?v=ytvid1')

    expect(response.status).toBe(422)
    expect(mocks.pipeline.exec).not.toHaveBeenCalled()
  })

  it.each(['ftp://www.youtube.com/watch?v=ytvid1', 'not a URL'])(
    'answers 422 for %s',
    async (url) => {
      const response = await ping(url)

      expect(response.status).toBe(422)
      expect(mocks.pipeline.exec).not.toHaveBeenCalled()
    },
  )

  it('answers 415 for a request that is not a ping', async () => {
    const response = await POST(
      new Request('https://shinju.date/api/ping', {
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(415)
  })

  it('adds 1 to the clicks of the video and the talent for the day in Japan', async () => {
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.Instant.from('2026-11-16T15:30:00Z').toZonedDateTimeISO(
        TIME_ZONE,
      ),
    )

    const response = await ping('https://www.twitch.tv/videos/2000000002')

    expect(response.status).toBe(204)

    const videoKey = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20261117`
    const talentKey = `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}20261117`

    expect(mocks.pipeline.zincrby).toHaveBeenCalledTimes(2)
    expect(mocks.pipeline.zincrby).toHaveBeenCalledWith(
      videoKey,
      1,
      'video-other',
    )
    expect(mocks.pipeline.zincrby).toHaveBeenCalledWith(
      talentKey,
      1,
      'talent-b',
    )
    expect(mocks.pipeline.expire).toHaveBeenCalledTimes(2)
    expect(mocks.pipeline.expire).toHaveBeenCalledWith(
      videoKey,
      90 * 24 * 60 * 60,
    )
    expect(mocks.pipeline.expire).toHaveBeenCalledWith(
      talentKey,
      90 * 24 * 60 * 60,
    )
    expect(mocks.pipeline.exec).toHaveBeenCalledOnce()
    expect(mocks.track).toHaveBeenCalledWith(
      'Link click',
      expect.objectContaining({
        provider: 'Twitch',
        talent_id: 'talent-b',
        url: 'https://www.twitch.tv/videos/2000000002',
        video_id: 'video-other',
      }),
      { headers: expect.any(Headers) },
    )
  })
})
