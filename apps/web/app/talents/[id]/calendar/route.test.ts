// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTalent,
  createVideoOnYouTube,
  createYouTubeChannel,
} from '@/test/factories'
import {
  failSupabase,
  seedSupabase,
  setupSupabase,
  supabaseRequests,
  videoSeed,
} from '@/test/supabase'

const mocks = vi.hoisted(() => ({
  // Entries of the `'use cache'` functions, keyed by their arguments
  cacheEntries: new Map<string, unknown>(),
  logger: { error: vi.fn() },
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('@shinju-date/logger', () => ({
  logger: mocks.logger,
}))

// Vitest does not run `'use cache'`, so serve the second call with the same
// arguments from the entry of the first, as Next.js does
vi.mock('@/lib/fetchers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/fetchers')>()

  function cached<Args extends unknown[], Result>(
    name: string,
    fn: (...args: Args) => Promise<Result>,
  ): (...args: Args) => Promise<Result> {
    return (...args) => {
      const key = JSON.stringify([name, args])

      if (!mocks.cacheEntries.has(key)) {
        mocks.cacheEntries.set(key, fn(...args))
      }

      return mocks.cacheEntries.get(key) as Promise<Result>
    }
  }

  return {
    ...actual,
    fetchCalendarVideos: cached(
      'fetchCalendarVideos',
      actual.fetchCalendarVideos,
    ),
    fetchTalent: cached('fetchTalent', actual.fetchTalent),
  }
})

import { GET } from './route'

setupSupabase()

const talent = createTalent({ name: '朝霧ミオ' })
const otherTalent = createTalent({ name: '風花リツ' })
const channel = createYouTubeChannel({ talent_id: talent.id })
const otherChannel = createYouTubeChannel({ talent_id: otherTalent.id })

const song = createVideoOnYouTube(channel, { title: '歌枠' })
const short = createVideoOnYouTube(channel, {
  title: 'ショート',
  video_kind: 'short',
})
const otherSong = createVideoOnYouTube(otherChannel, { title: '歌ってみた' })

function get(id: string): Promise<Response> {
  return GET(new Request(`https://shinju.date/talents/${id}.ics`), {
    params: Promise.resolve({ id }),
  })
}

/** The IDs of the videos of the events of a calendar, sorted */
async function eventIds(response: Response): Promise<string[]> {
  return [...(await response.text()).matchAll(/^UID:(.+)@shinju\.date/gm)]
    .map(([, id]) => id ?? '')
    .toSorted()
}

describe('GET /talents/[id].ics', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.cacheEntries.clear()

    await seedSupabase({
      talents: [talent, otherTalent],
      youtubeChannels: [channel, otherChannel],
      ...videoSeed([song, short, otherSong]),
    })
  })

  it('returns the videos of every kind of the talent', async () => {
    const response = await get(talent.id)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'text/calendar; charset=UTF-8',
    )
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
    )
    expect(await eventIds(response)).toEqual(
      [song.video.id, short.video.id].toSorted(),
    )
  })

  it('does not query Supabase again for the same talent', async () => {
    await get(talent.id)
    const response = await get(talent.id)

    expect(response.status).toBe(200)
    expect(await eventIds(response)).toContain(song.video.id)
    expect(supabaseRequests('talents')).toHaveLength(1)
    expect(supabaseRequests('videos')).toHaveLength(1)
  })

  it.each([
    ['does not exist', []],
    ['is retired', [{ ...talent, status: 'retired' as const }]],
    ['is deleted', [{ ...talent, deleted_at: '2026-11-01T00:00:00Z' }]],
  ])('answers 404 for a talent that %s', async (_, talents) => {
    await seedSupabase({
      talents,
      youtubeChannels: [channel],
      ...videoSeed([song]),
    })

    const response = await get(talent.id)

    expect(response.status).toBe(404)
    expect(supabaseRequests('videos')).toEqual([])
  })

  it.each(['abc', 'not-a-uuid', `${talent.id}x`])(
    'answers 404 for IDs that are not UUIDs (%s)',
    async (id) => {
      const response = await get(id)

      expect(response.status).toBe(404)
      expect(supabaseRequests()).toEqual([])
    },
  )

  it('answers 500 without the error message when the talent cannot be fetched', async () => {
    failSupabase('talents', 'relation "talents" does not exist')

    const response = await get(talent.id)

    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('relation')
    expect(mocks.logger.error).toHaveBeenCalledOnce()
    expect(supabaseRequests('videos')).toEqual([])
  })

  it('answers 500 without the error message when the videos cannot be fetched', async () => {
    failSupabase('videos', 'relation "videos" does not exist')

    const response = await get(talent.id)

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.text()).not.toContain('relation')
    expect(mocks.logger.error).toHaveBeenCalledOnce()
  })
})
