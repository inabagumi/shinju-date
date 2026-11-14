import { ENQUEUE_SCRIPT, REQUEUE_SCRIPT, RUN_UNLOCK_SCRIPT } from '../index.js'

/**
 * The subset of Redis the queue uses, kept in memory. Values are stored as
 * they are given, like `@upstash/redis` does with automatic serialization.
 */
export class FakeRedis {
  /**
   * Runs right before the next script, e.g. to let another request or a
   * worker get in between a request's read and its write.
   */
  beforeNextScript: (() => Promise<void>) | undefined
  /**
   * Makes LPUSH fail like it does on a key of the wrong type. As in Redis,
   * the commands of a transaction or script before it are not rolled back.
   */
  lpushFails = false
  readonly lists = new Map<string, unknown[]>()
  readonly ttls = new Map<string, number>()
  readonly values = new Map<string, unknown>()

  async del(...keys: string[]): Promise<number> {
    let count = 0

    for (const key of keys) {
      if (this.values.delete(key) || this.lists.delete(key)) {
        count++
      }
    }

    return count
  }

  /**
   * Runs the scripts of the queue the way Redis would. Values are kept
   * deserialized, so they are compared as JSON.
   */
  async eval(script: string, keys: string[], args: unknown[]): Promise<number> {
    const hook = this.beforeNextScript

    this.beforeNextScript = undefined
    await hook?.()

    // Scripts run one at a time, as in Redis, and a failing command stops
    // the script.
    const run = this.#scripts.then(() => {
      switch (script) {
        case ENQUEUE_SCRIPT:
          return this.#enqueueScript(
            keys,
            args as [string, string, number, string],
          )
        case REQUEUE_SCRIPT:
          return this.#requeueScript(keys, args as [string, string, number])
        case RUN_UNLOCK_SCRIPT:
          return this.#runUnlockScript(keys, args as [string])
        default:
          throw new Error('Unexpected script')
      }
    })

    this.#scripts = run.then(
      () => undefined,
      () => undefined,
    )

    return run
  }

  #scripts: Promise<void> = Promise.resolve()

  async #enqueueScript(
    [jobKey = '', queueKey = '', workerLockKey = '']: string[],
    [expected, job, ttl, id]: [string, string, number, string],
  ): Promise<number> {
    const current = this.values.get(jobKey)

    if (
      expected === ''
        ? current !== undefined
        : JSON.stringify(current) !== expected
    ) {
      return 0
    }

    if (this.values.has(workerLockKey)) {
      return 0
    }

    await this.lpush(queueKey, id)
    await this.expire(queueKey, ttl)
    await this.set(jobKey, JSON.parse(job), { ex: ttl })

    return 1
  }

  async #requeueScript(
    [queueKey = '', jobKey = '', workerLockKey = '']: string[],
    [id, job, ttl]: [string, string, number],
  ): Promise<number> {
    await this.lpush(queueKey, id)
    await this.expire(queueKey, ttl)
    await this.set(jobKey, JSON.parse(job), { ex: ttl })
    await this.del(workerLockKey)

    return 1
  }

  async #runUnlockScript(
    [lockKey = '']: string[],
    [token]: [string],
  ): Promise<number> {
    if (this.values.get(lockKey) !== token) {
      return 0
    }

    return this.del(lockKey)
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.ttls.set(key, seconds)

    return 1
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null
  }

  async lpush(key: string, ...elements: unknown[]): Promise<number> {
    if (this.lpushFails) {
      throw new Error(
        'WRONGTYPE Operation against a key holding the wrong kind of value',
      )
    }

    const list = this.lists.get(key) ?? []

    list.unshift(...elements.reverse())
    this.lists.set(key, list)

    return list.length
  }

  async mget<T extends unknown[]>(...keys: string[]): Promise<T> {
    return keys.map((key) => this.values.get(key) ?? null) as T
  }

  /** Commands queued in a transaction run together, or not at all. */
  multi() {
    const commands: (() => Promise<unknown>)[] = []
    const transaction = {
      del: (...keys: string[]) => {
        commands.push(() => this.del(...keys))
        return transaction
      },
      exec: async () => {
        // Like Redis, a failing command does not stop the others.
        const results: unknown[] = []

        for (const command of commands) {
          try {
            results.push(await command())
          } catch (error) {
            results.push(error)
          }
        }

        return results
      },
      expire: (key: string, seconds: number) => {
        commands.push(() => this.expire(key, seconds))
        return transaction
      },
      lpush: (key: string, ...elements: unknown[]) => {
        commands.push(() => this.lpush(key, ...elements))
        return transaction
      },
      set: (
        key: string,
        value: unknown,
        options?: { ex?: number; nx?: boolean },
      ) => {
        commands.push(() => this.set(key, value, options))
        return transaction
      },
    }

    return transaction
  }

  async rpop<T>(key: string): Promise<T | null> {
    return (this.lists.get(key)?.pop() as T | undefined) ?? null
  }

  async set(
    key: string,
    value: unknown,
    options: { ex?: number; nx?: boolean } = {},
  ): Promise<'OK' | null> {
    if (options.nx && this.values.has(key)) {
      return null
    }

    this.values.set(key, value)

    if (options.ex !== undefined) {
      this.ttls.set(key, options.ex)
    }

    return 'OK'
  }
}
