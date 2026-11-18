import { RUN_UNLOCK_SCRIPT } from '../runs.js'
import {
  CLAIM_SCRIPT,
  ENQUEUE_SCRIPT,
  FINISH_SCRIPT,
  REQUEUE_SCRIPT,
  SAVE_SCRIPT,
} from '../scripts.js'

/** A reply of Redis, as the REST API of Upstash returns it in JSON. */
export type RedisReply = number | string | null | RedisReply[]

/**
 * Runs one Redis command, such as `call('GET', key)`, and returns its reply,
 * or throws the error of Redis. Like `redis.call` in a Lua script.
 */
export type RedisCall = (...command: string[]) => RedisReply

/**
 * Does what a Lua script does, with the commands it runs. A command that
 * throws stops it, without undoing the ones before, as in Redis.
 */
export type ScriptEmulation = (
  call: RedisCall,
  keys: readonly string[],
  argv: readonly string[],
) => RedisReply

/**
 * The name of a script, taken from the comment on its first line, such as
 * `video-backfill:enqueue`.
 */
export function getScriptName(script: string): string | undefined {
  return script.match(/^--\s*(\S+)/)?.[1]
}

/**
 * The version of a stored job, as `ENQUEUE_SCRIPT` reads it: 0 for a job
 * without one, and `undefined` for a value that is not a job, which never
 * matches a version.
 */
function getVersion(value: string): number | undefined {
  let job: unknown

  try {
    job = JSON.parse(value)
  } catch {
    return undefined
  }

  if (typeof job !== 'object' || job === null) {
    return undefined
  }

  const { version } = job as { version?: unknown }

  return typeof version === 'number' ? version : 0
}

function nameOf(script: string): string {
  const name = getScriptName(script)

  if (!name) {
    throw new Error('A script must start with a comment that names it')
  }

  return name
}

/**
 * The scripts of this package, emulated with the commands they run, by
 * their names. For mocks of Redis that cannot run Lua: {@link FakeRedis} and
 * the mock of Upstash in `@shinju-date/msw-handlers`.
 *
 * The tests of the queue (`describeOnEachRedis` in `test/redis.ts`) run
 * against both real Redis and {@link FakeRedis}, so an emulation that does
 * not do what its script does fails them.
 */
export const SCRIPT_EMULATIONS: Readonly<Record<string, ScriptEmulation>> = {
  [nameOf(ENQUEUE_SCRIPT)]: (call, [job = '', queue = '', lock = ''], argv) => {
    const [expected = '', value = '', ttl = '', id = ''] = argv
    const current = call('GET', job)

    if (
      expected === ''
        ? current !== null
        : typeof current !== 'string' ||
          getVersion(current) !== Number(expected)
    ) {
      return 0
    }

    if (call('EXISTS', lock) === 1) {
      return 0
    }

    call('LPUSH', queue, id)
    call('EXPIRE', queue, ttl)
    call('SET', job, value, 'EX', ttl)

    return 1
  },
  [nameOf(CLAIM_SCRIPT)]: (
    call,
    [queue = '', jobPrefix = '', lockPrefix = ''],
    argv,
  ) => {
    const [token = '', lease = '', timestamp = '', ttl = ''] = argv

    while (true) {
      const id = call('RPOP', queue)

      if (typeof id !== 'string') {
        return null
      }

      const lock = `${lockPrefix}${id}`

      if (call('SET', lock, token, 'EX', lease, 'NX') !== null) {
        const key = `${jobPrefix}${id}`
        const value = call('GET', key)
        const job =
          typeof value === 'string'
            ? (JSON.parse(value) as Record<string, unknown>)
            : null

        if (job && job['status'] !== 'done' && job['status'] !== 'failed') {
          const encoded = JSON.stringify({
            ...job,
            startedAt: job['startedAt'] ?? timestamp,
            status: 'running',
            updatedAt: timestamp,
            version:
              (typeof job['version'] === 'number' ? job['version'] : 0) + 1,
          })

          call('SET', key, encoded, 'EX', ttl)

          return encoded
        }

        call('DEL', lock)
      }
    }
  },
  [nameOf(FINISH_SCRIPT)]: (call, [job = '', lock = '', ...copies], argv) => {
    const [token = '', value = '', ttl = ''] = argv

    if (call('GET', lock) !== token) {
      return 0
    }

    call('SET', job, value, 'EX', ttl)

    for (const copy of copies) {
      call('SET', copy, value, 'EX', ttl)
    }

    call('DEL', lock)

    return 1
  },
  [nameOf(REQUEUE_SCRIPT)]: (call, [queue = '', job = '', lock = ''], argv) => {
    const [id = '', value = '', ttl = '', token = ''] = argv

    if (call('GET', lock) !== token) {
      return 0
    }

    call('LPUSH', queue, id)
    call('EXPIRE', queue, ttl)
    call('SET', job, value, 'EX', ttl)
    call('DEL', lock)

    return 1
  },
  [nameOf(RUN_UNLOCK_SCRIPT)]: (call, [lock = ''], [token]) =>
    call('GET', lock) === token ? call('DEL', lock) : 0,
  [nameOf(SAVE_SCRIPT)]: (call, [job = '', lock = ''], argv) => {
    const [token = '', value = '', ttl = ''] = argv

    if (call('GET', lock) !== token) {
      return 0
    }

    call('SET', job, value, 'EX', ttl)

    return 1
  },
}
