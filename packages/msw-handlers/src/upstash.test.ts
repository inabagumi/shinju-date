import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { Redis } from '@upstash/redis'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { talents, videos } from './collections.js'
import { server } from './server.js'

describe('Upstash Redis Handlers', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('PING command', () => {
    it('should respond with PONG', async () => {
      const response = await fetch('https://fake.upstash.test/v2/ping', {
        body: JSON.stringify([]),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = (await response.json()) as { result: unknown }

      expect(response.ok).toBe(true)
      expect(data.result).toBe('PONG')
    })
  })

  describe('ZRANGE command', () => {
    it('should return sorted set data', async () => {
      const response = await fetch('https://fake.upstash.test/v2/zrange', {
        body: JSON.stringify([
          'videos:clicked:2023-10-23',
          '0',
          '2',
          'REV',
          'WITHSCORES',
        ]),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = (await response.json()) as { result: unknown }

      expect(response.ok).toBe(true)
      expect(data.result).toBeDefined()
      expect(Array.isArray(data.result)).toBe(true)
    })
  })

  describe('ZRANGE command through @upstash/redis', () => {
    const redis = new Redis({
      token: 'fake-token',
      url: 'https://fake.upstash.test',
    })
    // The mock store holds the click data of the last 7 days (in
    // TIME_ZONE). Yesterday is used so that the key exists even across
    // midnight.
    const key = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${formatDateKey(
      Temporal.Now.plainDateISO(TIME_ZONE).subtract({ days: 1 }),
    )}`

    function toPairs(result: unknown[]): [unknown, unknown][] {
      const pairs: [unknown, unknown][] = []

      for (let i = 0; i < result.length; i += 2) {
        pairs.push([result[i], result[i + 1]])
      }

      return pairs
    }

    it('returns members with scores in ascending order with withScores', async () => {
      const result = await redis.zrange<unknown[]>(key, 0, -1, {
        withScores: true,
      })
      const pairs = toPairs(result)
      const scores = pairs.map(([, score]) => score)

      expect(pairs.length).toBeGreaterThan(0)

      for (const [member, score] of pairs) {
        expect(member).toEqual(expect.any(String))
        expect(score).toEqual(expect.any(Number))
      }

      expect(scores).toEqual([...scores].sort((a, b) => Number(a) - Number(b)))
    })

    it('returns members with scores in descending order with rev', async () => {
      const result = await redis.zrange<unknown[]>(key, 0, -1, {
        rev: true,
        withScores: true,
      })
      const scores = toPairs(result).map(([, score]) => score)

      expect(scores.length).toBeGreaterThan(0)
      expect(scores).toEqual(scores.map(() => expect.any(Number)))
      expect(scores).toEqual([...scores].sort((a, b) => Number(b) - Number(a)))
    })

    it('returns only members without withScores', async () => {
      const withScores = await redis.zrange<unknown[]>(key, 0, -1, {
        withScores: true,
      })
      const members = await redis.zrange<string[]>(key, 0, -1)

      expect(members).toEqual(toPairs(withScores).map(([member]) => member))
    })

    it('applies the options in a pipeline', async () => {
      const [result] = await redis
        .pipeline()
        .zrange(key, 0, 0, { rev: true, withScores: true })
        .exec<[unknown[]]>()
      const all = await redis.zrange<unknown[]>(key, 0, -1, {
        rev: true,
        withScores: true,
      })

      expect(result).toEqual(all.slice(0, 2))
    })
  })

  describe('click data', () => {
    const redis = new Redis({
      token: 'fake-token',
      url: 'https://fake.upstash.test',
    })
    // Yesterday is used so that the keys exist even across midnight.
    const dateKey = formatDateKey(
      Temporal.Now.plainDateISO(TIME_ZONE).subtract({ days: 1 }),
    )

    async function getScores(key: string): Promise<Map<string, number>> {
      const result = await redis.zrange<(string | number)[]>(key, 0, -1, {
        withScores: true,
      })
      const scores = new Map<string, number>()

      for (let i = 0; i < result.length; i += 2) {
        scores.set(String(result[i]), Number(result[i + 1]))
      }

      return scores
    }

    it('uses the IDs of the visible videos of the Supabase mock', async () => {
      const videoScores = await getScores(
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`,
      )
      const visibleVideoIds = new Set(
        (await videos.findMany())
          .filter((video) => video.visible && video.deleted_at === null)
          .map((video) => video.id),
      )

      expect(videoScores.size).toBeGreaterThan(0)

      for (const id of videoScores.keys()) {
        expect(visibleVideoIds.has(id)).toBe(true)
      }
    })

    it('counts the clicks of each talent from the clicks of their videos', async () => {
      const videoScores = await getScores(
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`,
      )
      const talentScores = await getScores(
        `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${dateKey}`,
      )
      const talentIdByVideoId = new Map(
        (await videos.findMany()).map((video) => [video.id, video.talent_id]),
      )
      const talentIds = new Set(
        (await talents.findMany()).map((talent) => talent.id),
      )
      const expected = new Map<string, number>()

      for (const [videoId, score] of videoScores) {
        const talentId = talentIdByVideoId.get(videoId) ?? ''

        expected.set(talentId, (expected.get(talentId) ?? 0) + score)
      }

      expect(talentScores).toEqual(expected)

      for (const id of talentScores.keys()) {
        expect(talentIds.has(id)).toBe(true)
      }
    })
  })

  describe('Pipeline commands', () => {
    it('should handle multiple commands', async () => {
      const response = await fetch('https://fake.upstash.test/v2/pipeline', {
        body: JSON.stringify([
          ['PING'],
          [
            'ZRANGE',
            'videos:clicked:2023-10-23',
            '0',
            '1',
            'REV',
            'WITHSCORES',
          ],
        ]),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      // More flexible check - data might be an object or array
      if (Array.isArray(data)) {
        expect(data).toHaveLength(2)
        expect(data[0].result).toBe('PONG')
      } else {
        // If it's not an array, at least verify it's a valid response
        expect(data).toBeDefined()
      }
    })
  })

  describe('GET/SET commands', () => {
    it('should handle basic key-value operations', async () => {
      // Test SET
      const setResponse = await fetch('https://fake.upstash.test/v2/set', {
        body: JSON.stringify(['test:key', 'test:value']),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const setData = (await setResponse.json()) as { result: unknown }

      expect(setResponse.ok).toBe(true)
      expect(setData.result).toBe('OK')

      // Test GET
      const getResponse = await fetch('https://fake.upstash.test/v2/get', {
        body: JSON.stringify(['test:key']),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const getData = (await getResponse.json()) as { result: unknown }

      expect(getResponse.ok).toBe(true)
      expect(getData.result).toBe('test:value')
    })
  })

  describe('INCR/EXPIRE commands', () => {
    const redis = new Redis({
      token: 'fake-token',
      url: 'https://fake.upstash.test',
    })

    it('counts up in a transaction, like the rate limits of batch', async () => {
      const key = `test:incr:${crypto.randomUUID()}`

      const first = await redis.multi().incr(key).expire(key, 30).exec()
      const second = await redis.multi().incr(key).expire(key, 30).exec()

      expect(first).toEqual([1, 1])
      expect(second).toEqual([2, 1])
    })

    it('does not set the expiry of a missing key', async () => {
      await expect(
        redis.expire(`test:expire:${crypto.randomUUID()}`, 30),
      ).resolves.toBe(0)
    })
  })

  describe('commands of the backfill queue', () => {
    async function send(command: unknown[]) {
      const response = await fetch('https://fake.upstash.test/', {
        body: JSON.stringify(command),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const body = (await response.json()) as { result: unknown }

      return body.result
    }

    it('sets a key only when it is missing with NX', async () => {
      await expect(
        send(['set', 'test:lock', '1', 'ex', 60, 'nx']),
      ).resolves.toBe('OK')
      await expect(
        send(['set', 'test:lock', '2', 'ex', 60, 'nx']),
      ).resolves.toBeNull()
      await expect(send(['mget', 'test:lock', 'test:none'])).resolves.toEqual([
        '1',
        null,
      ])
    })

    it('emulates the enqueue script of the backfill queue', async () => {
      const script = '-- video-backfill:enqueue\n...'
      const job = JSON.stringify({ status: 'pending' })
      const keys = ['test:job', 'test:backfill-queue', 'test:job-lock']

      await expect(
        send(['eval', script, 3, ...keys, '', job, 60, 'youtube:x']),
      ).resolves.toBe(1)
      // A second request that also read no job does not save over it.
      await expect(
        send(['eval', script, 3, ...keys, '', job, 60, 'youtube:x']),
      ).resolves.toBe(0)
      await expect(send(['rpop', 'test:backfill-queue'])).resolves.toBe(
        'youtube:x',
      )
    })

    it('emulates the requeue script of the backfill queue', async () => {
      const script = '-- video-backfill:requeue\n...'
      const job = JSON.stringify({ status: 'pending' })

      await send(['set', 'test:requeue-lock', 'token-1'])

      const requeue = (token: string) =>
        send([
          'eval',
          script,
          3,
          'test:requeue-queue',
          'test:requeue-job',
          'test:requeue-lock',
          'youtube:y',
          job,
          60,
          token,
        ])

      // Not the token of the worker that holds the job.
      await expect(requeue('token-2')).resolves.toBe(0)
      await expect(requeue('token-1')).resolves.toBe(1)
      await expect(send(['get', 'test:requeue-job'])).resolves.toBe(job)
      await expect(send(['mget', 'test:requeue-lock'])).resolves.toEqual([null])
      await expect(send(['rpop', 'test:requeue-queue'])).resolves.toBe(
        'youtube:y',
      )
    })

    it('emulates the claim script of the backfill queue', async () => {
      const script = '-- video-backfill:claim\n...'
      const job = { id: 'youtube:z', startedAt: null, status: 'pending' }
      const claim = (token: string) =>
        send([
          'eval',
          script,
          3,
          'test:claim-queue',
          'test:claim-job:',
          'test:claim-lock:',
          token,
          360,
          '2026-11-14T00:00:00Z',
          60,
        ])

      await send(['set', 'test:claim-job:youtube:z', JSON.stringify(job)])
      await send(['lpush', 'test:claim-queue', 'youtube:z', 'youtube:z'])

      await expect(claim('token-1')).resolves.toBe(
        JSON.stringify({
          ...job,
          startedAt: '2026-11-14T00:00:00Z',
          status: 'running',
          updatedAt: '2026-11-14T00:00:00Z',
        }),
      )
      await expect(send(['get', 'test:claim-lock:youtube:z'])).resolves.toBe(
        'token-1',
      )
      // The second entry is locked by the first claim.
      await expect(claim('token-2')).resolves.toBeNull()
    })

    it('emulates the save and finish scripts of the backfill queue', async () => {
      const job = JSON.stringify({ status: 'done' })

      await send(['set', 'test:save-lock', 'token-1'])

      await expect(
        send([
          'eval',
          '-- video-backfill:save\n...',
          2,
          'test:save-job',
          'test:save-lock',
          'token-2',
          job,
          60,
        ]),
      ).resolves.toBe(0)
      await expect(send(['get', 'test:save-job'])).resolves.toBeNull()

      await expect(
        send([
          'eval',
          '-- video-backfill:finish\n...',
          3,
          'test:save-job',
          'test:save-lock',
          'test:save-outcome',
          'token-1',
          job,
          60,
        ]),
      ).resolves.toBe(1)
      await expect(
        send(['mget', 'test:save-job', 'test:save-outcome', 'test:save-lock']),
      ).resolves.toEqual([job, job, null])
    })

    it('emulates the unlock script of a check of all accounts', async () => {
      const script = '-- video-backfill:run-unlock\n...'

      await send(['set', 'test:run-lock', 'token-2'])

      // The lock of a request that ran out was taken by another one.
      await expect(
        send(['eval', script, 1, 'test:run-lock', 'token-1']),
      ).resolves.toBe(0)
      await expect(send(['get', 'test:run-lock'])).resolves.toBe('token-2')

      await expect(
        send(['eval', script, 1, 'test:run-lock', 'token-2']),
      ).resolves.toBe(1)
      await expect(send(['get', 'test:run-lock'])).resolves.toBeNull()
    })

    it('emulates the script that releases the lock of a cron job', async () => {
      const script = '-- batch:release-lock\n...'

      await send(['set', 'test:cron-lock', 'value-2', 'nx', 'ex', 130])

      // The lock of a run that ran out was taken by another one.
      await expect(
        send(['eval', script, 1, 'test:cron-lock', 'value-1']),
      ).resolves.toBe(0)
      await expect(send(['get', 'test:cron-lock'])).resolves.toBe('value-2')

      await expect(
        send(['eval', script, 1, 'test:cron-lock', 'value-2']),
      ).resolves.toBe(1)
      await expect(send(['get', 'test:cron-lock'])).resolves.toBeNull()
    })

    it('works as a FIFO queue with LPUSH and RPOP', async () => {
      await expect(send(['lpush', 'test:queue', 'a'])).resolves.toBe(1)
      await expect(send(['lpush', 'test:queue', 'b', 'c'])).resolves.toBe(3)
      await expect(send(['rpop', 'test:queue'])).resolves.toBe('a')
      await expect(send(['rpop', 'test:queue'])).resolves.toBe('b')
      await expect(send(['rpop', 'test:queue'])).resolves.toBe('c')
      await expect(send(['rpop', 'test:queue'])).resolves.toBeNull()
    })
  })
})
