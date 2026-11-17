import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey, getMondayOfWeek } from '@shinju-date/temporal-fns'
import { Redis } from '@upstash/redis'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { SUPPORTED_COMMANDS } from './handlers/upstash/commands.js'
import { server } from './server.js'

const UPSTASH_URL = 'https://fake.upstash.test'

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/**
 * The methods of `@upstash/redis` that are not Redis commands, and the
 * objects of JavaScript whose methods have the names of Redis commands (such
 * as `Object.keys`).
 */
const NON_COMMAND_METHODS = new Set([
  'addTelemetry',
  'autoPipeline',
  'exec',
  'multi',
  'pipeline',
  'use',
])
const NON_REDIS_RECEIVERS = new Set([
  'Array',
  'JSON',
  'Math',
  'Number',
  'Object',
  'Promise',
  'Reflect',
  'String',
])

/** The Redis commands that `@upstash/redis` has methods for. */
function getClientCommands(): Set<string> {
  const redis = new Redis({ token: 'fake-token', url: UPSTASH_URL })
  const pipeline = redis.pipeline()
  const names = [redis, pipeline].flatMap((client) =>
    Object.entries(client)
      .filter(([, value]) => typeof value === 'function')
      .map(([name]) => name),
  )

  return new Set(names.filter((name) => !NON_COMMAND_METHODS.has(name)))
}

/**
 * The Redis commands that the code of `apps/` and `packages/` calls: the
 * methods of `@upstash/redis` called in the files that use Redis, except the
 * tests (which use fakes) and this package.
 */
function findUsedCommands(): Map<string, Set<string>> {
  const commands = getClientCommands()
  const files = execFileSync(
    'git',
    ['ls-files', '--', 'apps/**/*.ts', 'apps/**/*.tsx', 'packages/**/*.ts'],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
  )
    .split('\n')
    .filter(
      (file) =>
        file !== '' &&
        !file.startsWith('packages/msw-handlers/') &&
        !/(^|\/)(__tests__|e2e|test)\/|\.(test|spec)\.tsx?$/.test(file),
    )
  const used = new Map<string, Set<string>>()

  for (const file of files) {
    const source = readFileSync(`${REPOSITORY_ROOT}${file}`, 'utf8')

    if (!/redis/i.test(source)) {
      continue
    }

    for (const [, receiver = '', method = ''] of source.matchAll(
      /(\w*)\s*\.\s*([a-z][A-Za-z]*)\s*(?:<[^<>()]*>)?\(/g,
    )) {
      if (commands.has(method) && !NON_REDIS_RECEIVERS.has(receiver)) {
        // `evalRo` is `EVAL_RO`, `scriptLoad` is `SCRIPT LOAD` and so on, so
        // the name of the command is the method in lower case.
        const command = method.toLowerCase()

        used.set(command, (used.get(command) ?? new Set()).add(file))
      }
    }
  }

  return used
}

async function send(
  path: string,
  body: unknown,
): Promise<{ body: unknown; status: number }> {
  const response = await fetch(`${UPSTASH_URL}${path}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  return { body: await response.json(), status: response.status }
}

/** A key that no other test uses. */
function uniqueKey(name: string): string {
  return `test:${name}:${crypto.randomUUID()}`
}

describe('Upstash Redis commands', () => {
  const redis = new Redis({ token: 'fake-token', url: UPSTASH_URL })

  beforeAll(() => server.listen())
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(() => server.close())

  describe('the commands that the apps use', () => {
    const used = findUsedCommands()

    it('finds the commands in the code', () => {
      // A command of each kind that the apps are known to use, so that the
      // search does not silently find nothing
      expect([...used.keys()]).toEqual(
        expect.arrayContaining(['eval', 'hincrby', 'zincrby', 'zrange']),
      )
    })

    it.each([...used])('implements %s', (command, files) => {
      expect(
        SUPPORTED_COMMANDS,
        `${command} is used by ${[...files].join(', ')}`,
      ).toContain(command)
    })
  })

  describe('unknown commands', () => {
    it('returns the error of Redis with 400 for a single command', async () => {
      const response = await send('/', ['FOOBAR', 'a', 1])

      expect(response).toEqual({
        body: {
          error:
            "ERR unknown command 'FOOBAR', with args beginning with: 'a' '1' ",
        },
        status: 400,
      })
    })

    it('returns the error for a command in the path', async () => {
      const response = await send('/v2/foobar', ['a'])

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: expect.stringMatching(/^ERR unknown command 'foobar'/),
      })
    })

    it('throws from @upstash/redis', async () => {
      await expect(redis.hrandfield(uniqueKey('hrandfield'))).rejects.toThrow(
        /ERR unknown command 'hrandfield'/,
      )
    })

    it('returns the error of the command in a pipeline, and runs the others', async () => {
      const key = uniqueKey('pipeline')
      const response = await send('/pipeline', [
        ['SET', key, 'a'],
        ['FOOBAR'],
        ['GET', key],
      ])

      expect(response).toEqual({
        body: [
          { result: 'OK' },
          { error: expect.stringMatching(/^ERR unknown command 'FOOBAR'/) },
          { result: 'a' },
        ],
        status: 200,
      })
    })

    it('discards a transaction with an unknown command', async () => {
      const key = uniqueKey('multi')
      const response = await send('/multi-exec', [
        ['SET', key, 'a'],
        ['FOOBAR'],
      ])

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: expect.stringMatching(/^EXECABORT .*unknown command 'FOOBAR'/),
      })
      await expect(redis.exists(key)).resolves.toBe(0)
    })

    it('returns an error for a script that the mock cannot run', async () => {
      await expect(redis.eval('return 1', [], [])).rejects.toThrow(
        /the mock cannot run this script/,
      )
    })
  })

  describe('errors of Redis', () => {
    it('returns WRONGTYPE for a key of another type', async () => {
      const key = uniqueKey('wrongtype')

      await redis.set(key, 'a')

      await expect(redis.zincrby(key, 1, 'm')).rejects.toThrow(/WRONGTYPE/)
    })

    it('returns an error for the wrong number of arguments', async () => {
      const response = await send('/', ['GET'])

      expect(response).toEqual({
        body: { error: "ERR wrong number of arguments for 'get' command" },
        status: 400,
      })
    })

    it('does not increment a value that is not an integer', async () => {
      const key = uniqueKey('incr')

      await redis.set(key, 'a')

      await expect(redis.incr(key)).rejects.toThrow(/not an integer/)
    })
  })

  describe('strings and keys', () => {
    it('expires a key after the time of EX, and reports the TTL', async () => {
      const key = uniqueKey('ttl')
      const now = Temporal.Now.instant()

      await redis.set(key, 'a', { ex: 60 })

      await expect(redis.ttl(key)).resolves.toBe(60)

      vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
        now.add({ seconds: 61 }),
      )

      await expect(redis.get(key)).resolves.toBeNull()
      await expect(redis.exists(key)).resolves.toBe(0)
      await expect(redis.ttl(key)).resolves.toBe(-2)
    })

    it('sets the expiry of a key with EXPIRE and SETEX', async () => {
      const key = uniqueKey('expire')
      const other = uniqueKey('setex')

      await redis.set(key, 'a')

      await expect(redis.ttl(key)).resolves.toBe(-1)
      await expect(redis.expire(key, 30)).resolves.toBe(1)
      await expect(redis.ttl(key)).resolves.toBe(30)
      await expect(redis.setex(other, 10, 'b')).resolves.toBe('OK')
      await expect(redis.ttl(other)).resolves.toBe(10)
      // SET removes the expiry
      await redis.set(key, 'b')
      await expect(redis.ttl(key)).resolves.toBe(-1)
    })

    it('counts the keys that exist', async () => {
      const key = uniqueKey('exists')

      await redis.set(key, 'a')

      await expect(redis.exists(key, uniqueKey('none'), key)).resolves.toBe(2)
    })

    it('stores values as strings, like Redis', async () => {
      const key = uniqueKey('json')

      await redis.set(key, { a: 1 })

      await expect(redis.get(key)).resolves.toEqual({ a: 1 })
      await expect(send('/', ['GET', key])).resolves.toEqual({
        body: { result: '{"a":1}' },
        status: 200,
      })
    })
  })

  describe('sets', () => {
    it('adds, counts and removes members', async () => {
      const key = uniqueKey('set')

      await expect(redis.sadd(key, 'a', 'b', 'a')).resolves.toBe(2)
      await expect(redis.scard(key)).resolves.toBe(2)
      await expect(redis.srem(key, 'a', 'c')).resolves.toBe(1)
      await expect(redis.smembers(key)).resolves.toEqual(['b'])
      await expect(redis.srem(key, 'b')).resolves.toBe(1)
      // An empty set is removed
      await expect(redis.exists(key)).resolves.toBe(0)
    })
  })

  describe('hashes', () => {
    it('increments fields and returns all of them', async () => {
      const key = uniqueKey('hash')

      await expect(redis.hincrby(key, 'a', 2)).resolves.toBe(2)
      await expect(redis.hincrby(key, 'a', 3)).resolves.toBe(5)
      await expect(redis.hincrby(key, 'b', 1)).resolves.toBe(1)
      await expect(redis.hgetall(key)).resolves.toEqual({ a: 5, b: 1 })
      await expect(redis.hgetall(uniqueKey('none'))).resolves.toBeNull()
    })
  })

  describe('sorted sets', () => {
    it('increments, scores and counts members', async () => {
      const key = uniqueKey('zset')

      await expect(redis.zincrby(key, 1, 'a')).resolves.toBe(1)
      await expect(redis.zincrby(key, 2.5, 'a')).resolves.toBe(3.5)
      await expect(redis.zscore(key, 'a')).resolves.toBe(3.5)
      await expect(redis.zscore(key, 'b')).resolves.toBeNull()
      await expect(redis.zcard(key)).resolves.toBe(1)
    })

    it('adds members with the options of ZADD', async () => {
      const key = uniqueKey('zadd')

      await expect(
        redis.zadd(key, { member: 'a', score: 1 }, { member: 'b', score: 2 }),
      ).resolves.toBe(2)
      await expect(
        redis.zadd(key, { nx: true }, { member: 'a', score: 5 }),
      ).resolves.toBe(0)
      await expect(
        redis.zadd(key, { ch: true, xx: true }, { member: 'b', score: 3 }),
      ).resolves.toBe(1)
      await expect(
        redis.zadd(key, { gt: true }, { member: 'b', score: 1 }),
      ).resolves.toBe(0)
      await expect(
        redis.zrange(key, 0, -1, { withScores: true }),
      ).resolves.toEqual(['a', 1, 'b', 3])
    })

    it('reads ranges by score, in reverse and with a limit', async () => {
      const key = uniqueKey('zrange')

      await redis.zadd(
        key,
        { member: 'a', score: 1 },
        { member: 'b', score: 2 },
        { member: 'c', score: 3 },
        { member: 'd', score: 4 },
      )

      await expect(
        redis.zrange(key, 2, '+inf', { byScore: true }),
      ).resolves.toEqual(['b', 'c', 'd'])
      await expect(
        redis.zrange(key, '(4', 2, { byScore: true, rev: true }),
      ).resolves.toEqual(['c', 'b'])
      await expect(
        redis.zrange(key, '-inf', '+inf', {
          byScore: true,
          count: 2,
          offset: 1,
        }),
      ).resolves.toEqual(['b', 'c'])
      await expect(redis.zrange(key, -2, -1)).resolves.toEqual(['c', 'd'])
    })

    it('stores the union of sorted sets with weights', async () => {
      const first = uniqueKey('union:1')
      const second = uniqueKey('union:2')
      const destination = uniqueKey('union')

      await redis.zadd(first, { member: 'a', score: 1 })
      await redis.zadd(
        second,
        { member: 'a', score: 2 },
        { member: 'b', score: 3 },
      )

      await expect(
        redis.zunionstore(destination, 2, [first, second], {
          weights: [1, 2],
        }),
      ).resolves.toBe(2)
      await expect(
        redis.zrange(destination, 0, -1, { withScores: true }),
      ).resolves.toEqual(['a', 5, 'b', 6])
    })
  })

  describe('analytics', () => {
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const dateKey = formatDateKey(now)

    it('reflects a click on the public site in the click data that admin reads', async () => {
      const videoId = crypto.randomUUID()
      const talentId = crypto.randomUUID()
      const videoKey = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`
      const talentKey = `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${dateKey}`

      // Like `increment` of apps/web
      for (let i = 0; i < 2; i++) {
        await redis
          .multi()
          .zincrby(videoKey, 1, videoId)
          .expire(videoKey, 90 * 24 * 60 * 60)
          .zincrby(talentKey, 1, talentId)
          .expire(talentKey, 90 * 24 * 60 * 60)
          .exec()
      }

      // Like apps/admin: the popular videos, the clicks of a video and the
      // click volume
      const [scores] = await redis
        .pipeline()
        .zrange(videoKey, 0, -1, { rev: true, withScores: true })
        .exec<[(string | number)[]]>()
      const index = scores.indexOf(videoId)

      expect(index).toBeGreaterThanOrEqual(0)
      expect(scores[index + 1]).toBe(2)
      await expect(redis.zscore(videoKey, videoId)).resolves.toBe(2)
      await expect(redis.zscore(talentKey, talentId)).resolves.toBe(2)
      await expect(redis.ttl(videoKey)).resolves.toBe(90 * 24 * 60 * 60)
    })

    it('reflects a search on the public site in the search data that admin reads', async () => {
      const query = `query-${crypto.randomUUID()}`
      const dailyKey = `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${dateKey}`
      const weeklyKey = `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}${getMondayOfWeek(now)}`
      const volumeKey = `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${dateKey}`
      const volumeBefore = (await redis.get<number>(volumeKey)) ?? 0

      // Like `logSearchQuery` of apps/web, for a search without results
      await redis
        .multi()
        .zincrby(dailyKey, 1, query)
        .expire(dailyKey, 90 * 24 * 60 * 60)
        .zincrby(weeklyKey, 1, query)
        .expire(weeklyKey, 35 * 24 * 60 * 60)
        .zincrby(REDIS_KEYS.SEARCH_POPULAR_ALL_TIME, 1, query)
        .sadd(REDIS_KEYS.SEARCH_ZERO_RESULTS, query)
        .incr(volumeKey)
        .expire(volumeKey, 90 * 24 * 60 * 60)
        .exec()

      // Like apps/admin: the popular keywords, the zero-result keywords and
      // the search volume
      const [volume] = await redis.pipeline().get<number>(volumeKey).exec()

      await expect(redis.zscore(dailyKey, query)).resolves.toBe(1)
      await expect(redis.zscore(weeklyKey, query)).resolves.toBe(1)
      await expect(
        redis.zscore(REDIS_KEYS.SEARCH_POPULAR_ALL_TIME, query),
      ).resolves.toBe(1)
      await expect(
        redis.smembers(REDIS_KEYS.SEARCH_ZERO_RESULTS),
      ).resolves.toContain(query)
      expect(volume).toBe(volumeBefore + 1)
    })
  })
})
