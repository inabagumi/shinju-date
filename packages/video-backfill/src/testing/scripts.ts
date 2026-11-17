import { ENQUEUE_SCRIPT, REQUEUE_SCRIPT } from '../queue.js'
import { RUN_UNLOCK_SCRIPT } from '../runs.js'

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
 * The tests in `src/__tests__/integration/` run against both real Redis and
 * {@link FakeRedis}, so an emulation that does not do what its script does
 * fails them.
 */
export const SCRIPT_EMULATIONS: Readonly<Record<string, ScriptEmulation>> = {
  [nameOf(ENQUEUE_SCRIPT)]: (call, [job = '', queue = '', lock = ''], argv) => {
    const [expected = '', value = '', ttl = '', id = ''] = argv
    const current = call('GET', job)

    if (expected === '' ? current !== null : current !== expected) {
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
  [nameOf(REQUEUE_SCRIPT)]: (call, [queue = '', job = '', lock = ''], argv) => {
    const [id = '', value = '', ttl = ''] = argv

    call('LPUSH', queue, id)
    call('EXPIRE', queue, ttl)
    call('SET', job, value, 'EX', ttl)
    call('DEL', lock)

    return 1
  },
  [nameOf(RUN_UNLOCK_SCRIPT)]: (call, [lock = ''], [token]) =>
    call('GET', lock) === token ? call('DEL', lock) : 0,
}
