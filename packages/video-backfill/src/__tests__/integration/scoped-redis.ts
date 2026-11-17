import type { Redis } from '@upstash/redis'
import { afterEach, beforeEach, expect } from 'vitest'

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
    multi: () => {
      const transaction = client.multi()
      const wrapped = {
        del: (...keys: string[]) => {
          transaction.del(...keys.map(scoped))
          return wrapped
        },
        exec: () => transaction.exec(),
        set: (key: string, value: unknown, options?: SetOptions) => {
          transaction.set(scoped(key), value, toSetCommandOptions(options))
          return wrapped
        },
      }

      return wrapped
    },
    rpop: (key: string) => client.rpop(scoped(key)),
    set: (key: string, value: unknown, options?: SetOptions) =>
      client.set(scoped(key), value, toSetCommandOptions(options)),
    ttl: (key: string) => client.ttl(scoped(key)),
  }

  return {
    beforeNextScript(hook) {
      nextScriptHook = hook
    },
    async cleanup() {
      if (used.size > 0) {
        await client.del(...[...used].map((key) => `${prefix}${key}`))
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
