import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { server } from './server.js'

const REST_URL = 'https://fake.supabase.test/rest/v1'

interface Video {
  deleted_at: string | null
  id: string
  talent_id: string
  visible: boolean
}

interface Talent {
  deleted_at: string | null
  id: string
}

interface ErrorBody {
  code: string
  details: string | null
  hint: string | null
  message: string
}

async function get(path: string, init?: RequestInit): Promise<Response> {
  return await fetch(`${REST_URL}/${path}`, init)
}

async function getJson<T>(path: string): Promise<T> {
  const response = await get(path)

  expect(response.ok).toBe(true)

  return (await response.json()) as T
}

/** The IDs of the rows, sorted, to compare them regardless of the order. */
function ids(rows: readonly { id: string }[]): string[] {
  return rows.map(({ id }) => id).sort()
}

describe('Supabase filters', () => {
  let videos: Video[]
  let talents: Talent[]

  beforeAll(async () => {
    server.listen()
    videos = await getJson<Video[]>(
      'videos?select=id,talent_id,visible,deleted_at',
    )
    talents = await getJson<Talent[]>('talents?select=id,deleted_at')
  })

  afterAll(() => {
    server.close()
  })

  describe('unsupported filters', () => {
    it.each([
      ['title=fts.歌枠', 'fts'],
      ['synonyms=cs.{a}', 'cs'],
      ['title=eq(any).{a,b}', 'eq(any)'],
      ['or=(title.fts.歌枠)', 'fts'],
      ['visible=not.foo.true', 'foo'],
    ])('returns 400 for %s, naming the operator', async (filter, operator) => {
      const response = await get(`videos?select=id&${filter}`)
      const body = (await response.json()) as ErrorBody

      expect(response.status).toBe(400)
      expect(body).toEqual({
        code: 'PGRST100',
        details: expect.any(String),
        hint: null,
        message: expect.stringContaining(`"${operator}"`),
      })
    })

    it.each([
      // `in` without a list
      'id=in.1',
      // `is` takes only null, not_null, true, false and unknown
      'deleted_at=is.foo',
      // A filter in the key, which PostgREST does not support
      'id.in.(1,2)',
      // A cast
      'title::text=eq.1',
      // A logic tree without parentheses
      'or=id.eq.1',
      // A condition without an operator in a logic tree
      'or=(id)',
    ])('returns 400 for the unsupported form %s', async (filter) => {
      const response = await get(`videos?select=id&${filter}`)

      expect(response.status).toBe(400)
      expect(((await response.json()) as ErrorBody).code).toBe('PGRST100')
    })

    it('returns 400 for a HEAD request with an unsupported operator', async () => {
      const response = await get('videos?select=id&title=fts.a', {
        method: 'HEAD',
      })

      expect(response.status).toBe(400)
    })

    it('changes nothing in a write with an unsupported operator', async () => {
      const [video] = videos
      const response = await get(`videos?id=fts.${video?.id}`, {
        body: JSON.stringify({ visible: !video?.visible }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const [current] = await getJson<Video[]>(
        `videos?select=id,visible&id=eq.${video?.id}`,
      )

      expect(response.status).toBe(400)
      expect(current?.visible).toBe(video?.visible)
    })

    it.each([
      ['an unsupported select', 'id,...talents(name)', 'PGRST100'],
      [
        'a relation that the table does not have',
        'id,announcements(id)',
        'PGRST200',
      ],
    ])(
      'changes nothing in a write that returns %s',
      async (_, select, code) => {
        const [video] = videos
        const termsBefore = await getJson<unknown[]>('terms?select=id')
        const headers = {
          'Content-Type': 'application/json',
          prefer: 'return=representation',
        }
        const patched = await get(
          `videos?id=eq.${video?.id}&select=${encodeURIComponent(select)}`,
          {
            body: JSON.stringify({ visible: !video?.visible }),
            headers,
            method: 'PATCH',
          },
        )
        const deleted = await get(
          `videos?id=eq.${video?.id}&select=${encodeURIComponent(select)}`,
          { headers, method: 'DELETE' },
        )
        const created = await get(
          `terms?select=${encodeURIComponent(select.replace('talents', 'videos'))}`,
          {
            body: JSON.stringify({
              readings: [],
              synonyms: [],
              term: `term-${crypto.randomUUID()}`,
            }),
            headers,
            method: 'POST',
          },
        )
        const [current] = await getJson<Video[]>(
          `videos?select=id,visible&id=eq.${video?.id}`,
        )
        const termsAfter = await getJson<unknown[]>('terms?select=id')

        for (const response of [patched, deleted, created]) {
          expect(response.status).toBe(400)
          expect(((await response.json()) as ErrorBody).code).toBe(code)
        }

        expect(current).toEqual({ id: video?.id, visible: video?.visible })
        expect(termsAfter).toHaveLength(termsBefore.length)
      },
    )

    it('returns PGRST200 for a relation that the table does not have, even without rows', async () => {
      const response = await get(
        'videos?select=id,announcements(id)&id=eq.00000000-0000-4000-8000-000000000000',
      )

      expect(response.status).toBe(400)
      expect(((await response.json()) as ErrorBody).code).toBe('PGRST200')
    })

    it('returns 400 for an order by a column of an embedded resource', async () => {
      const response = await get(
        'videos?select=id,talent:talents(name)&order=talent(name).asc',
      )

      expect(response.status).toBe(400)
      expect(((await response.json()) as ErrorBody).code).toBe('PGRST100')
    })

    it('returns 400 for a spread in the select', async () => {
      const response = await get('videos?select=id,...talents(name)')

      expect(response.status).toBe(400)
      expect(((await response.json()) as ErrorBody).code).toBe('PGRST100')
    })
  })

  describe('operators', () => {
    it('matches booleans with is', async () => {
      const visible = await getJson<Video[]>('videos?select=id&visible=is.true')
      const hidden = await getJson<Video[]>('videos?select=id&visible=is.false')

      expect(ids(visible)).toEqual(ids(videos.filter((video) => video.visible)))
      expect(ids(hidden)).toEqual(ids(videos.filter((video) => !video.visible)))
    })

    it('negates any operator with not', async () => {
      const [video] = videos
      const rows = await getJson<Video[]>(
        `videos?select=id&id=not.eq.${video?.id}`,
      )

      expect(ids(rows)).toEqual(
        ids(videos.filter(({ id }) => id !== video?.id)),
      )
    })

    it('does not match NULL with a negated comparison, like SQL', async () => {
      const rows = await getJson<Talent[]>(
        'talents?select=id,deleted_at&deleted_at=not.lt.1970-01-01T00:00:00Z',
      )

      expect(ids(rows)).toEqual(
        ids(talents.filter(({ deleted_at }) => deleted_at !== null)),
      )
    })

    it('matches NULL with isdistinct', async () => {
      const rows = await getJson<Talent[]>(
        'talents?select=id&deleted_at=isdistinct.null',
      )

      expect(ids(rows)).toEqual(
        ids(talents.filter(({ deleted_at }) => deleted_at !== null)),
      )
    })

    it('matches patterns with like and regular expressions with match', async () => {
      const [talent] = await getJson<{ id: string; name: string }[]>(
        'talents?select=id,name&limit=1',
      )
      const name = talent?.name ?? ''
      const liked = await getJson<{ id: string }[]>(
        `talents?select=id&name=like.${encodeURIComponent(`${name.slice(0, 1)}*`)}`,
      )
      const matched = await getJson<{ id: string }[]>(
        `talents?select=id&name=match.${encodeURIComponent(`^${name}$`)}`,
      )

      expect(liked.map(({ id }) => id)).toContain(talent?.id)
      expect(matched.map(({ id }) => id)).toEqual([talent?.id])
    })
  })

  describe('uuid columns', () => {
    /** Whether the upper case of an ID differs, because it has letters. */
    const hasLetters = (id: string) => id !== id.toUpperCase()

    // The IDs of the seeded talents have no letters, unlike those of videos
    const video = () => {
      const found = videos.find(({ id }) => hasLetters(id))

      expect(found).toBeDefined()

      return found as Video
    }

    it('matches the IDs in upper case with eq, like PostgreSQL', async () => {
      const { id } = video()
      const rows = await getJson<Video[]>(
        `videos?select=id&id=eq.${id.toUpperCase()}`,
      )

      expect(ids(rows)).toEqual([id])
    })

    it('leaves out the IDs in upper case with neq', async () => {
      const { id } = video()
      const rows = await getJson<Video[]>(
        `videos?select=id&id=neq.${id.toUpperCase()}`,
      )

      expect(ids(rows)).toEqual(ids(videos.filter((row) => row.id !== id)))
    })

    it('matches the IDs in upper case with in', async () => {
      const { id } = video()
      const rows = await getJson<Video[]>(
        `videos?select=id&id=in.(${id.toUpperCase()},00000000-0000-0000-0000-000000000000)`,
      )

      expect(ids(rows)).toEqual([id])
    })

    it('treats the IDs in upper case as the same with isdistinct', async () => {
      const { id } = video()
      const rows = await getJson<Video[]>(
        `videos?select=id&id=isdistinct.${id.toUpperCase()}`,
      )

      expect(ids(rows)).toEqual(ids(videos.filter((row) => row.id !== id)))
    })

    /** The ID of a video on YouTube, from the `video_id` of its row. */
    const youtubeVideoId = async () => {
      const rows = await getJson<{ video_id: string }[]>(
        'youtube_videos?select=video_id',
      )
      const id = rows.map(({ video_id }) => video_id).find(hasLetters)

      expect(id).toBeDefined()

      return id as string
    }

    it('matches the references to other tables in upper case', async () => {
      const id = await youtubeVideoId()
      const rows = await getJson<{ video_id: string }[]>(
        `youtube_videos?select=video_id&video_id=eq.${id.toUpperCase()}`,
      )

      expect(rows).toEqual([{ video_id: id }])
    })

    it('matches the IDs in upper case in a logic tree and an embedded resource', async () => {
      const id = await youtubeVideoId()
      const inTree = await getJson<Video[]>(
        `videos?select=id&or=(id.eq.${id.toUpperCase()})`,
      )
      const embedded = await getJson<{ video: { id: string } }[]>(
        `youtube_videos?select=video:videos!inner(id)&video.id=eq.${id.toUpperCase()}`,
      )

      expect(ids(inTree)).toEqual([id])
      expect(embedded).toEqual([{ video: { id } }])
    })

    it('updates the row of an ID in upper case', async () => {
      const { id, visible } = video()
      const response = await get(
        `videos?select=id,visible&id=eq.${id.toUpperCase()}`,
        {
          body: JSON.stringify({ visible }),
          headers: {
            'Content-Type': 'application/json',
            prefer: 'return=representation',
          },
          method: 'PATCH',
        },
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual([{ id, visible }])
    })

    it('matches the IDs in upper case in the rows of a database function', async () => {
      const search = async (filter: string) => {
        const response = await fetch(
          `${REST_URL}/rpc/search_videos_v4?select=id&${filter}`,
          {
            body: JSON.stringify({ p_perpage: 1000, p_query: '' }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          },
        )

        expect(response.ok).toBe(true)

        return ids((await response.json()) as { id: string }[])
      }
      const id = (await search('limit=1000')).find(hasLetters)

      expect(id).toBeDefined()
      expect(await search(`id=eq.${id?.toUpperCase()}`)).toEqual([id])
    })

    it('still compares the text columns with case', async () => {
      const youtubeVideos = await getJson<{ youtube_video_id: string }[]>(
        'youtube_videos?select=youtube_video_id',
      )
      const youtubeVideoId = youtubeVideos
        .map(({ youtube_video_id }) => youtube_video_id)
        .find(hasLetters)

      expect(youtubeVideoId).toBeDefined()

      const rows = await getJson<unknown[]>(
        `youtube_videos?select=id&youtube_video_id=eq.${youtubeVideoId?.toUpperCase()}`,
      )

      expect(rows).toEqual([])
    })
  })

  describe('JSON paths', () => {
    interface Term {
      readings: string[]
      term: string
    }

    it('orders by an element of an array, like the terms of admin', async () => {
      const rows = await getJson<Term[]>(
        'terms?select=term,readings&order=readings->0.asc',
      )
      const firstReadings = rows.map(({ readings }) => readings[0] ?? '')

      expect(rows.length).toBeGreaterThan(1)
      expect(firstReadings).toEqual(firstReadings.toSorted())
    })

    it('rejects a long invalid JSON path quickly', async () => {
      const started = performance.now()
      const response = await get(
        `terms?select=term&readings${'->0'.repeat(40)}!=eq.a`,
      )

      expect(response.status).toBe(400)
      expect(performance.now() - started).toBeLessThan(1000)
    })

    it('filters by a JSON path as text', async () => {
      const [term] = await getJson<Term[]>('terms?select=term,readings&limit=1')
      const rows = await getJson<Term[]>(
        `terms?select=term&readings->>0=eq.${encodeURIComponent(term?.readings[0] ?? '')}`,
      )

      expect(rows.map(({ term }) => term)).toContain(term?.term)
    })
  })

  describe('logic trees', () => {
    it('combines the conditions of or with OR', async () => {
      const [first, second] = videos
      const rows = await getJson<Video[]>(
        `videos?select=id&or=(id.eq.${first?.id},id.eq.${second?.id})`,
      )

      expect(ids(rows)).toEqual([first?.id, second?.id].sort())
    })

    it('combines or with the other filters with AND', async () => {
      const [first, second] = videos
      const rows = await getJson<Video[]>(
        `videos?select=id&or=(id.eq.${first?.id},id.eq.${second?.id})&id=neq.${second?.id}`,
      )

      expect(ids(rows)).toEqual([first?.id])
    })

    it('narrows down to the rows that existed at a time, like the stats snapshot', async () => {
      const deleted = talents.find(({ deleted_at }) => deleted_at !== null)
      const asOf = deleted?.deleted_at ?? ''
      const rows = await getJson<Talent[]>(
        `talents?select=id&or=${encodeURIComponent(`(deleted_at.is.null,deleted_at.gte.${asOf})`)}`,
      )
      const after = await getJson<Talent[]>(
        `talents?select=id&or=${encodeURIComponent(
          `(deleted_at.is.null,deleted_at.gt.${asOf})`,
        )}`,
      )

      expect(deleted).toBeDefined()
      expect(ids(rows)).toContain(deleted?.id)
      expect(ids(after)).not.toContain(deleted?.id)
      expect(ids(after)).toEqual(
        ids(
          talents.filter(
            ({ deleted_at }) =>
              deleted_at === null ||
              Temporal.Instant.compare(deleted_at, asOf) > 0,
          ),
        ),
      )
    })

    it('nests and in or, and negates them with not', async () => {
      const [first, second] = videos
      const nested = await getJson<Video[]>(
        `videos?select=id&or=(id.eq.${first?.id},and(id.eq.${second?.id},visible.eq.${second?.visible}))`,
      )
      const negated = await getJson<Video[]>(
        `videos?select=id&not.or=(id.eq.${first?.id},id.eq.${second?.id})`,
      )

      expect(ids(nested)).toEqual([first?.id, second?.id].sort())
      expect(ids(negated)).toEqual(
        ids(videos.filter(({ id }) => id !== first?.id && id !== second?.id)),
      )
    })

    it('reads lists and quoted values in a logic tree', async () => {
      const [first, second, third] = videos
      const rows = await getJson<Video[]>(
        `videos?select=id&or=(id.in.(${first?.id},${second?.id}),id.eq."${third?.id}")`,
      )

      expect(ids(rows)).toEqual([first?.id, second?.id, third?.id].sort())
    })
  })

  describe('embedded resources', () => {
    const deletedTalentIds = () =>
      new Set(
        talents
          .filter(({ deleted_at }) => deleted_at !== null)
          .map(({ id }) => id),
      )

    it('leaves out the rows whose embedded resource does not match with !inner', async () => {
      const talentId = videos[0]?.talent_id
      const rows = await getJson<{ id: string; talents: { id: string } }[]>(
        `videos?select=id,talents!inner(id)&talents.id=not.eq.${talentId}`,
      )
      const expected = videos.filter(({ talent_id }) => talent_id !== talentId)

      expect(expected.length).toBeGreaterThan(0)
      expect(expected.length).toBeLessThan(videos.length)
      expect(ids(rows)).toEqual(ids(expected))

      for (const row of rows) {
        expect(row.talents.id).not.toBe(talentId)
      }
    })

    it('narrows down to the videos of deleted talents, like the cascade of batch', async () => {
      const rows = await getJson<{ id: string }[]>(
        'videos?select=id,thumbnail_id,talents!inner(deleted_at)&deleted_at=is.null&talents.deleted_at=not.is.null',
      )

      expect(ids(rows)).toEqual(
        ids(
          videos.filter(
            ({ deleted_at, talent_id }) =>
              deleted_at === null && deletedTalentIds().has(talent_id),
          ),
        ),
      )
    })

    it('refers to an embedded resource by its alias', async () => {
      const rows = await getJson<{ id: string }[]>(
        'videos?select=id,talent:talents!inner(id)&talent.deleted_at=is.null',
      )

      expect(ids(rows)).toEqual(
        ids(
          videos.filter(({ talent_id }) => !deletedTalentIds().has(talent_id)),
        ),
      )
    })

    it('keeps the rows and embeds null without !inner', async () => {
      const rows = await getJson<
        { id: string; talent_id: string; talents: Talent | null }[]
      >(
        'videos?select=id,talent_id,talents(deleted_at)&talents.deleted_at=not.is.null',
      )

      expect(ids(rows)).toEqual(ids(videos))

      for (const row of rows) {
        expect(row.talents === null).toBe(
          !deletedTalentIds().has(row.talent_id),
        )
      }
    })

    it('filters the rows of a one-to-many resource', async () => {
      const [talent] = talents.filter(({ id }) =>
        videos.some(({ talent_id }) => talent_id === id),
      )
      const [channel] = await getJson<{ id: string; talent_id: string }[]>(
        `youtube_channels?select=id,talent_id&talent_id=eq.${talent?.id}`,
      )
      const rows = await getJson<
        { id: string; youtube_channels: { id: string }[] }[]
      >(
        `talents?select=id,youtube_channels(id)&youtube_channels.id=eq.${channel?.id}`,
      )

      for (const row of rows) {
        expect(row.youtube_channels).toEqual(
          row.id === talent?.id ? [{ id: channel?.id }] : [],
        )
      }
    })

    it('leaves out the rows without a related row with !inner', async () => {
      const response = await get(
        'videos?select=id,youtube_video:youtube_videos!inner(youtube_video_id)',
        { headers: { prefer: 'count=exact' } },
      )
      const rows = (await response.json()) as {
        youtube_video: { youtube_video_id: string }
      }[]
      const all = await getJson<{ youtube_video: unknown }[]>(
        'videos?select=id,youtube_video:youtube_videos(youtube_video_id)',
      )
      const withYouTube = all.filter(({ youtube_video }) => youtube_video)

      expect(withYouTube.length).toBeLessThan(all.length)
      expect(rows).toHaveLength(withYouTube.length)
      expect(response.headers.get('Content-Range')).toBe(
        `0-${rows.length - 1}/${withYouTube.length}`,
      )
    })

    it('counts after !inner in a HEAD request', async () => {
      const response = await get(
        `videos?select=id,talents!inner(id)&talents.id=eq.${videos[0]?.talent_id}`,
        { headers: { prefer: 'count=exact' }, method: 'HEAD' },
      )
      const count = videos.filter(
        ({ talent_id }) => talent_id === videos[0]?.talent_id,
      ).length

      expect(response.headers.get('Content-Range')).toBe(
        `0-${count - 1}/${count}`,
      )
    })

    it('returns PGRST108 for a filter on a resource that is not embedded', async () => {
      const response = await get('videos?select=id&talents.deleted_at=is.null')

      expect(response.status).toBe(400)
      expect(((await response.json()) as ErrorBody).code).toBe('PGRST108')
    })

    it('returns PGRST200 for a relation that the table does not have', async () => {
      const response = await get('videos?select=id,announcements(id)')

      expect(response.status).toBe(400)
      expect(((await response.json()) as ErrorBody).code).toBe('PGRST200')
    })

    it('returns 400 for a filter on an embedded resource in a write', async () => {
      const response = await get('videos?talents.deleted_at=is.null', {
        body: JSON.stringify({ visible: true }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })

      expect(response.status).toBe(400)
      expect(((await response.json()) as ErrorBody).code).toBe('PGRST100')
    })
  })
})
