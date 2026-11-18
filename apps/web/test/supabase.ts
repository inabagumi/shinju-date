/**
 * A mock Supabase for the tests, backed by the PostgREST mock of
 * `@shinju-date/msw-handlers`. The code under test sends its real queries,
 * and the mock answers with the rows that match their conditions, so the
 * tests check what a query returns rather than how it is built.
 *
 * ```ts
 * setupSupabase()
 *
 * test('returns the active talents', async () => {
 *   const talent = createTalent()
 *
 *   await seedSupabase({ talents: [talent] })
 *
 *   await expect(fetchActiveTalents()).resolves.toEqual([
 *     { id: talent.id, name: talent.name },
 *   ])
 * })
 * ```
 */

import type { Tables } from '@shinju-date/database'
import {
  announcements,
  featureRequests,
  profileImages,
  supabaseHandlers,
  talents,
  terms,
  thumbnails,
  twitchUsers,
  twitchVideos,
  videoBackfillJobs,
  videos,
  youtubeChannels,
  youtubeVideos,
} from '@shinju-date/msw-handlers'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import type { VideoOnTwitch, VideoOnYouTube } from './factories'

/** `NEXT_PUBLIC_SUPABASE_URL` of `vitest.config.ts` */
const SUPABASE_URL = 'https://fake.supabase.test'

const REST_URL = `${SUPABASE_URL}/rest/v1`

const server = setupServer(...supabaseHandlers)

/** A request to PostgREST that the code under test sent */
export interface SupabaseRequest {
  method: string
  /**
   * The key the request was sent with: the anonymous key, which RLS restricts,
   * or the service role key, which bypasses RLS
   */
  role: 'anon' | 'service_role' | null
  /** The table, or `rpc/<name>` for a database function */
  table: string
  url: URL
}

const requests: SupabaseRequest[] = []

function roleOf(key: string | null): SupabaseRequest['role'] {
  switch (key) {
    case process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']:
      return 'anon'
    case process.env['SUPABASE_SERVICE_ROLE_KEY']:
      return 'service_role'
    default:
      return null
  }
}

server.events.on('request:start', ({ request }) => {
  const url = new URL(request.url)

  if (url.href.startsWith(`${REST_URL}/`)) {
    requests.push({
      method: request.method,
      role: roleOf(request.headers.get('apikey')),
      table: url.pathname.slice(new URL(REST_URL).pathname.length + 1),
      url,
    })
  }
})

/**
 * Start the mock Supabase for the current test file. The database is emptied
 * before each test, and a request to a host that is not mocked fails the test,
 * so nothing can reach the network by accident.
 */
export function setupSupabase(): void {
  beforeAll(() => {
    server.listen({ onUnhandledFrame: 'error' })
  })

  beforeEach(async () => {
    requests.length = 0

    await seedSupabase()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })
}

/** The rows to put in the mock database, by table */
export interface SupabaseSeed {
  announcements?: readonly Tables<'announcements'>[]
  featureRequests?: readonly Tables<'feature_requests'>[]
  profileImages?: readonly Tables<'profile_images'>[]
  talents?: readonly Tables<'talents'>[]
  thumbnails?: readonly Tables<'thumbnails'>[]
  twitchUsers?: readonly Tables<'twitch_users'>[]
  twitchVideos?: readonly Tables<'twitch_videos'>[]
  videos?: readonly Tables<'videos'>[]
  youtubeChannels?: readonly Tables<'youtube_channels'>[]
  youtubeVideos?: readonly Tables<'youtube_videos'>[]
}

async function replace<Row>(
  collection: { clear(): void; create(values: Row): Promise<unknown> },
  rows: readonly Row[] = [],
): Promise<void> {
  collection.clear()

  // One by one, so the mock returns them in this order without `order`
  for (const row of rows) {
    await collection.create(row)
  }
}

/**
 * Replace the rows of the mock database with the given ones. The tables that
 * are not given are emptied.
 */
export async function seedSupabase(seed: SupabaseSeed = {}): Promise<void> {
  await replace(announcements, seed.announcements)
  await replace(featureRequests, seed.featureRequests)
  await replace(profileImages, seed.profileImages)
  await replace(talents, seed.talents)
  await replace(thumbnails, seed.thumbnails)
  await replace(twitchUsers, seed.twitchUsers)
  await replace(twitchVideos, seed.twitchVideos)
  await replace(videos, seed.videos)
  await replace(youtubeChannels, seed.youtubeChannels)
  await replace(youtubeVideos, seed.youtubeVideos)
  await replace(terms)
  await replace(videoBackfillJobs)
}

/**
 * The rows of `seedSupabase()` for videos made with `createVideoOnYouTube`,
 * `createVideoOnTwitch` or `createVideo` (a video without a YouTube or Twitch
 * video).
 */
export function videoSeed(
  rows: readonly (Tables<'videos'> | VideoOnTwitch | VideoOnYouTube)[],
): Pick<SupabaseSeed, 'twitchVideos' | 'videos' | 'youtubeVideos'> {
  return {
    twitchVideos: rows.flatMap((row) =>
      'twitchVideo' in row ? [row.twitchVideo] : [],
    ),
    videos: rows.map((row) => ('video' in row ? row.video : row)),
    youtubeVideos: rows.flatMap((row) =>
      'youtubeVideo' in row ? [row.youtubeVideo] : [],
    ),
  }
}

/**
 * Make the requests to a table (or `rpc/<name>`) fail with an error of
 * PostgreSQL, until the end of the test. The status is 400, which is not
 * retried.
 */
export function failSupabase(
  table: string,
  message = `relation "public.${table}" does not exist`,
): void {
  server.use(
    http.all(`${REST_URL}/${table}`, () =>
      HttpResponse.json(
        { code: '42P01', details: null, hint: null, message },
        { status: 400 },
      ),
    ),
  )
}

/**
 * Make the requests to a table (or `rpc/<name>`) fail on the network, until
 * the end of the test. Only for writes, as reads are retried.
 */
export function disconnectSupabase(table: string): void {
  server.use(http.all(`${REST_URL}/${table}`, () => HttpResponse.error()))
}

/** The requests to PostgREST sent in the current test, to a table if given */
export function supabaseRequests(table?: string): SupabaseRequest[] {
  return table === undefined
    ? [...requests]
    : requests.filter((request) => request.table === table)
}

/** The mock server, to add handlers for a test with `use()` */
export { server as supabaseServer }
