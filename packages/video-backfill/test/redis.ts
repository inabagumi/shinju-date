import { Redis } from '@upstash/redis'
import { afterEach, beforeEach, describe, expect } from 'vitest'
import { FakeRedis } from '../src/testing/index.js'

// The REST API of Upstash, or Serverless Redis HTTP in front of Redis
// (`compose.yml`, and the `services` of the test job in CI).
const url = process.env['UPSTASH_REDIS_REST_URL']
const token = process.env['UPSTASH_REDIS_REST_TOKEN']

/**
 * Defines the same tests on real Redis and on {@link FakeRedis}, so that the
 * scripts run on Redis and their emulations are checked by the same tests.
 * The tests on real Redis run only when `UPSTASH_REDIS_REST_URL` and
 * `UPSTASH_REDIS_REST_TOKEN` are set, and are skipped otherwise.
 *
 * `define` gets a function that creates the client a test runs against; pass
 * it to {@link useScopedRedis}.
 */
export function describeOnEachRedis(
  define: (createClient: () => Redis) => void,
): void {
  describe('on FakeRedis', () => {
    define(() => new FakeRedis() as unknown as Redis)
  })

  describe.skipIf(!url || !token)('on Redis', () => {
    define(() => new Redis({ token: token ?? '', url: url ?? '' }))
  })
}

interface SetOptions {
  ex?: number
  nx?: boolean
}

/**
 * A client of Redis whose keys all start with a prefix of its own, so that
 * tests can share one Redis, and whose keys are deleted when the test ends.
 */
export interface ScopedRedis {
  /**
   * Runs right before the next script, e.g. to let another request or a
   * worker get in between a request's read and its write.
   */
  beforeNextScript(hook: () => Promise<void>): void
  /** Deletes every key the test used. */
  cleanup(): Promise<void>
  /** The keys the test used so far, without the prefix. */
  keys(): string[]
  /** The client to give to the code under test. */
  redis: Redis
}

/**
 * Wraps the commands the queue uses (and the tests read with) so that they
 * work on the keys under `prefix`. Any other command is missing, so a test
 * that uses one fails instead of touching a key outside the prefix.
 */
export function scopeRedis(client: Redis, prefix: string): ScopedRedis {
  const used = new Set<string>()
  let nextScriptHook: (() => Promise<void>) | undefined

  const scoped = (key: string) => {
    used.add(key)

    return `${prefix}${key}`
  }

  const redis = {
    del: (...keys: string[]) => client.del(...keys.map(scoped)),
    eval: async (script: string, keys: string[], args: unknown[]) => {
      const hook = nextScriptHook

      nextScriptHook = undefined
      await hook?.()

      return client.eval(script, keys.map(scoped), args)
    },
    exists: (...keys: string[]) => client.exists(...keys.map(scoped)),
    expire: (key: string, seconds: number) =>
      client.expire(scoped(key), seconds),
    get: (key: string) => client.get(scoped(key)),
    lpush: (key: string, ...elements: unknown[]) =>
      client.lpush(scoped(key), ...elements),
    lrange: (key: string, start: number, stop: number) =>
      client.lrange(scoped(key), start, stop),
    mget: (...keys: string[]) => client.mget(...keys.map(scoped)),
    set: (key: string, value: unknown, options?: SetOptions) =>
      client.set(scoped(key), value, toSetCommandOptions(options)),
    ttl: (key: string) => client.ttl(scoped(key)),
  }

  return {
    beforeNextScript(hook) {
      nextScriptHook = hook
    },
    async cleanup() {
      const keys = new Set([...used].map((key) => `${prefix}${key}`))

      // Scripts also write keys that they make from a prefix, such as the
      // lock of a job they claim, which are not among the keys used.
      if (client instanceof Redis) {
        for (const key of await client.keys(`${prefix}*`)) {
          keys.add(key)
        }
      }

      if (keys.size > 0) {
        await client.del(...keys)
      }
    },
    keys() {
      return [...used]
    },
    redis: redis as unknown as Redis,
  }
}

function toSetCommandOptions(options: SetOptions | undefined) {
  // The options of `SET` of `@upstash/redis` are a union of shapes.
  return options as Parameters<Redis['set']>[2]
}

/**
 * Gives each test of the enclosing `describe` a {@link ScopedRedis} of its
 * own, on the client that `createClient` returns, and deletes its keys after
 * the test.
 */
export function useScopedRedis(createClient: () => Redis): () => ScopedRedis {
  let current: ScopedRedis | undefined

  beforeEach(() => {
    current = scopeRedis(
      createClient(),
      `test:video-backfill:${crypto.randomUUID()}:`,
    )
  })

  afterEach(async () => {
    await current?.cleanup()
    current = undefined
  })

  return () => {
    if (!current) {
      throw new Error('useScopedRedis() is only available inside a test')
    }

    return current
  }
}

/**
 * Checks the time to live of a key. Real Redis counts it down while the test
 * runs, so it may be a little less than it was set to.
 */
export async function expectTtl(
  redis: Redis,
  key: string,
  seconds: number,
): Promise<void> {
  const ttl = await redis.ttl(key)

  expect(ttl).toBeLessThanOrEqual(seconds)
  expect(ttl).toBeGreaterThan(seconds - 30)
}
