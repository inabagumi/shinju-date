/**
 * The Redis commands that the mock supports, with the semantics of Redis.
 *
 * Every command that `apps/` and `packages/` send has to be here
 * (`src/__tests__/upstash-commands.test.ts` checks it). A command that is not
 * here is an error, like an unknown command of Redis, so that the apps do not
 * silently get `null`.
 */
import {
  type MockRedisStore,
  RedisError,
  type RedisValueOf,
  wrongTypeError,
} from './store.js'

/** A reply of Redis as Upstash returns it in JSON. */
export type RedisReply = number | string | null | RedisReply[]

type CommandHandler = (store: MockRedisStore, args: string[]) => RedisReply

function syntaxError(): RedisError {
  return new RedisError('ERR syntax error')
}

function notIntegerError(): RedisError {
  return new RedisError('ERR value is not an integer or out of range')
}

/** Check the number of arguments of a command, like Redis does. */
function checkArity(
  name: string,
  args: readonly string[],
  min: number,
  max = Number.POSITIVE_INFINITY,
): void {
  if (args.length < min || args.length > max) {
    throw new RedisError(`ERR wrong number of arguments for '${name}' command`)
  }
}

function parseInteger(text: string | undefined): number {
  if (text === undefined || !/^-?\d+$/.test(text)) {
    throw notIntegerError()
  }

  return Number(text)
}

function parseScore(text: string | undefined): number {
  const normalized = text?.toLowerCase()

  if (normalized === '+inf' || normalized === 'inf') {
    return Number.POSITIVE_INFINITY
  }

  if (normalized === '-inf') {
    return Number.NEGATIVE_INFINITY
  }

  const score = Number(text)

  if (text === undefined || text.trim() === '' || Number.isNaN(score)) {
    throw new RedisError('ERR value is not a valid float')
  }

  return score
}

/** A score as Redis replies it, such as `"1"`, `"1.5"` or `"inf"`. */
function formatScore(score: number): string {
  if (score === Number.POSITIVE_INFINITY) {
    return 'inf'
  }

  if (score === Number.NEGATIVE_INFINITY) {
    return '-inf'
  }

  return String(score)
}

/** Take the options (case-insensitive) that a command accepts. */
function parseFlags(
  args: readonly string[],
  allowed: readonly string[],
): Set<string> {
  const flags = new Set<string>()

  for (const arg of args) {
    const flag = arg.toLowerCase()

    if (!allowed.includes(flag)) {
      throw syntaxError()
    }

    flags.add(flag)
  }

  return flags
}

/** The members of a sorted set, ordered by score and then by member. */
function sortZset(zset: RedisValueOf<'zset'>): [string, number][] {
  return [...zset].sort(([memberA, scoreA], [memberB, scoreB]) =>
    scoreA !== scoreB
      ? scoreA - scoreB
      : memberA < memberB
        ? -1
        : memberA > memberB
          ? 1
          : 0,
  )
}

/** A bound of `ZRANGE … BYSCORE`, such as `5`, `(5`, `-inf` or `+inf`. */
function parseScoreBound(text: string): { exclusive: boolean; score: number } {
  return text.startsWith('(')
    ? { exclusive: true, score: parseScore(text.slice(1)) }
    : { exclusive: false, score: parseScore(text) }
}

/** Resolve a range of indexes such as `0 -1` to `[start, end)`. */
function resolveIndexRange(
  length: number,
  startText: string | undefined,
  stopText: string | undefined,
): [number, number] {
  let start = parseInteger(startText)
  let stop = parseInteger(stopText)

  if (start < 0) {
    start = Math.max(0, length + start)
  }

  if (stop < 0) {
    stop = length + stop
  }

  return [start, Math.min(length, stop + 1)]
}

function zrange(store: MockRedisStore, args: string[]): RedisReply {
  checkArity('zrange', args, 3)

  const [key = '', min = '', max = '', ...options] = args
  let by: 'index' | 'score' = 'index'
  let limit: { count: number; offset: number } | null = null
  let rev = false
  let withScores = false

  for (let i = 0; i < options.length; i++) {
    const option = options[i]?.toLowerCase()

    if (option === 'byscore') {
      by = 'score'
    } else if (option === 'bylex') {
      throw new RedisError('ERR the mock does not support ZRANGE … BYLEX')
    } else if (option === 'rev') {
      rev = true
    } else if (option === 'withscores') {
      withScores = true
    } else if (option === 'limit') {
      limit = {
        count: parseInteger(options[i + 2]),
        offset: parseInteger(options[i + 1]),
      }
      i += 2
    } else {
      throw syntaxError()
    }
  }

  if (limit && by === 'index') {
    throw new RedisError(
      'ERR syntax error, LIMIT is only supported in combination with either BYSCORE or BYLEX',
    )
  }

  const zset = store.getOf(key, 'zset')
  let members = zset ? sortZset(zset) : []

  if (rev) {
    members.reverse()
  }

  if (by === 'index') {
    members = members.slice(...resolveIndexRange(members.length, min, max))
  } else {
    // With REV, the first bound is the maximum.
    const [low, high] = rev ? [max, min] : [min, max]

    const lowBound = parseScoreBound(low)
    const highBound = parseScoreBound(high)

    members = members.filter(
      ([, score]) =>
        (lowBound.exclusive
          ? score > lowBound.score
          : score >= lowBound.score) &&
        (highBound.exclusive
          ? score < highBound.score
          : score <= highBound.score),
    )

    if (limit) {
      members = members.slice(
        limit.offset,
        limit.count < 0 ? undefined : limit.offset + limit.count,
      )
    }
  }

  return members.flatMap(([member, score]) =>
    withScores ? [member, formatScore(score)] : [member],
  )
}

function zadd(store: MockRedisStore, args: string[]): RedisReply {
  checkArity('zadd', args, 3)

  const [key = '', ...rest] = args
  const flags = new Set<string>()

  while (
    rest[0] &&
    ['ch', 'gt', 'incr', 'lt', 'nx', 'xx'].includes(rest[0].toLowerCase())
  ) {
    flags.add(String(rest.shift()).toLowerCase())
  }

  if (
    rest.length === 0 ||
    rest.length % 2 !== 0 ||
    (flags.has('nx') &&
      (flags.has('xx') || flags.has('gt') || flags.has('lt'))) ||
    (flags.has('gt') && flags.has('lt')) ||
    (flags.has('incr') && rest.length !== 2)
  ) {
    throw syntaxError()
  }

  const pairs: [number, string][] = []

  for (let i = 0; i < rest.length; i += 2) {
    pairs.push([parseScore(rest[i]), rest[i + 1] ?? ''])
  }

  const existing = store.getOf(key, 'zset')

  if (!existing && flags.has('xx')) {
    return flags.has('incr') ? null : 0
  }

  const zset = existing ?? store.getOrCreate(key, 'zset')
  let added = 0
  let changed = 0
  let result: number | null = null

  for (const [score, member] of pairs) {
    const current = zset.get(member)
    const next = flags.has('incr') ? (current ?? 0) + score : score

    if (
      (current === undefined && flags.has('xx')) ||
      (current !== undefined && flags.has('nx')) ||
      (current !== undefined && flags.has('gt') && next <= current) ||
      (current !== undefined && flags.has('lt') && next >= current)
    ) {
      continue
    }

    if (current === undefined) {
      added += 1
    } else if (current !== next) {
      changed += 1
    }

    zset.set(member, next)
    result = next
  }

  store.deleteIfEmpty(key)

  if (flags.has('incr')) {
    return result === null ? null : formatScore(result)
  }

  return flags.has('ch') ? added + changed : added
}

function zunionstore(store: MockRedisStore, args: string[]): RedisReply {
  checkArity('zunionstore', args, 3)

  const [destination = '', numKeysText, ...rest] = args
  const numKeys = parseInteger(numKeysText)

  if (numKeys < 1 || rest.length < numKeys) {
    throw syntaxError()
  }

  const keys = rest.slice(0, numKeys)
  const options = rest.slice(numKeys)
  let weights = keys.map(() => 1)
  let aggregate: 'max' | 'min' | 'sum' = 'sum'

  for (let i = 0; i < options.length; i++) {
    const option = options[i]?.toLowerCase()

    if (option === 'weights') {
      weights = keys.map((_, index) => parseScore(options[i + 1 + index]))
      i += keys.length
    } else if (option === 'aggregate') {
      const value = options[i + 1]?.toLowerCase()

      if (value !== 'sum' && value !== 'min' && value !== 'max') {
        throw syntaxError()
      }

      aggregate = value
      i += 1
    } else {
      throw syntaxError()
    }
  }

  const union = new Map<string, number>()

  keys.forEach((key, index) => {
    const value = store.get(key)
    const weight = weights[index] ?? 1
    // The members of a set have the score 1, like in Redis.
    const entries: [string, number][] =
      value === undefined
        ? []
        : value.type === 'zset'
          ? [...value.value]
          : value.type === 'set'
            ? [...value.value].map((member) => [member, 1])
            : (() => {
                throw wrongTypeError()
              })()

    for (const [member, score] of entries) {
      const weighted = score * weight
      const current = union.get(member)

      union.set(
        member,
        current === undefined
          ? weighted
          : aggregate === 'sum'
            ? current + weighted
            : aggregate === 'min'
              ? Math.min(current, weighted)
              : Math.max(current, weighted),
      )
    }
  })

  store.delete(destination)

  if (union.size > 0) {
    store.set(destination, { type: 'zset', value: union })
  }

  return union.size
}

/** `SET` and the options of it that `@upstash/redis` sends. */
function set(store: MockRedisStore, args: string[]): RedisReply {
  checkArity('set', args, 2)

  const [key = '', value = '', ...options] = args
  let condition: 'nx' | 'xx' | null = null
  let expiresAt: Temporal.Instant | null = null
  let get = false
  let keepTtl = false
  let expirySet = false

  for (let i = 0; i < options.length; i++) {
    const option = options[i]?.toLowerCase()

    if (option === 'nx' || option === 'xx') {
      if (condition) {
        throw syntaxError()
      }

      condition = option
    } else if (option === 'get') {
      get = true
    } else if (option === 'keepttl') {
      keepTtl = true
    } else if (
      option === 'ex' ||
      option === 'px' ||
      option === 'exat' ||
      option === 'pxat'
    ) {
      if (expirySet) {
        throw syntaxError()
      }

      const amount = parseInteger(options[i + 1])

      if (amount <= 0) {
        throw new RedisError("ERR invalid expire time in 'set' command")
      }

      const now = Temporal.Now.instant()

      expiresAt =
        option === 'ex'
          ? now.add({ seconds: amount })
          : option === 'px'
            ? now.add({ milliseconds: amount })
            : option === 'exat'
              ? Temporal.Instant.fromEpochMilliseconds(amount * 1000)
              : Temporal.Instant.fromEpochMilliseconds(amount)
      expirySet = true
      i += 1
    } else {
      throw syntaxError()
    }
  }

  if (keepTtl && expirySet) {
    throw syntaxError()
  }

  const previous = get ? (store.getOf(key, 'string') ?? null) : null
  const exists = store.has(key)

  if ((condition === 'nx' && exists) || (condition === 'xx' && !exists)) {
    return get ? previous : null
  }

  store.set(key, { type: 'string', value }, { keepTtl })

  if (expiresAt) {
    store.setExpiry(key, expiresAt)
  }

  return get ? previous : 'OK'
}

/** `INCRBY` on a string, and the integer that it holds. */
function incrementString(
  store: MockRedisStore,
  key: string,
  increment: number,
): number {
  const current = store.getOf(key, 'string')
  const value = (current === undefined ? 0 : parseInteger(current)) + increment

  store.set(key, { type: 'string', value: String(value) }, { keepTtl: true })

  return value
}

/** The scripts of `EVAL` that the mock emulates, as the commands they run. */
const SCRIPTS: Record<
  string,
  (
    call: (...command: string[]) => RedisReply,
    keys: string[],
    argv: string[],
  ) => RedisReply
> = {
  // `ENQUEUE_SCRIPT` of `@shinju-date/video-backfill`
  'video-backfill:enqueue': (call, [job = '', queue = '', lock = ''], argv) => {
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
  // `REQUEUE_SCRIPT` of `@shinju-date/video-backfill`
  'video-backfill:requeue': (call, [queue = '', job = '', lock = ''], argv) => {
    const [id = '', value = '', ttl = ''] = argv

    call('LPUSH', queue, id)
    call('EXPIRE', queue, ttl)
    call('SET', job, value, 'EX', ttl)
    call('DEL', lock)

    return 1
  },
  // `RUN_UNLOCK_SCRIPT` of `@shinju-date/video-backfill`
  'video-backfill:run-unlock': (call, [lock = ''], [token]) =>
    call('GET', lock) === token ? call('DEL', lock) : 0,
}

/** The commands that the mock supports, by their lowercase names. */
export const COMMANDS: Record<string, CommandHandler> = {
  del(store, args) {
    checkArity('del', args, 1)

    return args.filter((key) => store.delete(key)).length
  },

  eval(store, args) {
    checkArity('eval', args, 2)

    const [script = '', numKeysText, ...rest] = args
    const numKeys = parseInteger(numKeysText)

    if (numKeys < 0 || numKeys > rest.length) {
      throw new RedisError(
        "ERR Number of keys can't be greater than number of args",
      )
    }

    // Lua cannot run here, so the known scripts are emulated with the
    // commands that they run. They are found by the comment on their first
    // line, such as `-- video-backfill:enqueue`.
    const name = script.match(/^--\s*(\S+)/)?.[1] ?? ''
    const emulate = SCRIPTS[name]

    if (!emulate) {
      throw new RedisError(
        `ERR the mock cannot run this script: add an emulation of it to SCRIPTS in src/handlers/upstash/commands.ts (known: ${Object.keys(SCRIPTS).join(', ')})`,
      )
    }

    return emulate(
      (...command) => runCommand(store, command),
      rest.slice(0, numKeys),
      rest.slice(numKeys),
    )
  },

  exists(store, args) {
    checkArity('exists', args, 1)

    return args.filter((key) => store.has(key)).length
  },

  expire(store, args) {
    checkArity('expire', args, 2, 3)

    const [key = '', secondsText, option] = args
    const seconds = parseInteger(secondsText)
    const flags = parseFlags(option ? [option] : [], ['gt', 'lt', 'nx', 'xx'])

    if (!store.has(key)) {
      return 0
    }

    const current = store.getExpiry(key)
    const next = Temporal.Now.instant().add({ seconds })

    // A key without an expiry time has an infinite TTL for GT and LT.
    if (
      (flags.has('nx') && current !== null) ||
      (flags.has('xx') && current === null) ||
      (flags.has('gt') &&
        (current === null || Temporal.Instant.compare(next, current) <= 0)) ||
      (flags.has('lt') &&
        current !== null &&
        Temporal.Instant.compare(next, current) >= 0)
    ) {
      return 0
    }

    if (seconds <= 0) {
      store.delete(key)
    } else {
      store.setExpiry(key, next)
    }

    return 1
  },

  get(store, args) {
    checkArity('get', args, 1, 1)

    return store.getOf(args[0] ?? '', 'string') ?? null
  },

  hgetall(store, args) {
    checkArity('hgetall', args, 1, 1)

    return [...(store.getOf(args[0] ?? '', 'hash') ?? [])].flat()
  },

  hincrby(store, args) {
    checkArity('hincrby', args, 3, 3)

    const [key = '', field = '', incrementText] = args
    const increment = parseInteger(incrementText)
    const hash = store.getOrCreate(key, 'hash')
    const current = hash.get(field)

    if (current !== undefined && !/^-?\d+$/.test(current)) {
      throw new RedisError('ERR hash value is not an integer')
    }

    const value = Number(current ?? 0) + increment

    hash.set(field, String(value))

    return value
  },

  incr(store, args) {
    checkArity('incr', args, 1, 1)

    return incrementString(store, args[0] ?? '', 1)
  },

  lpush(store, args) {
    checkArity('lpush', args, 2)

    const [key = '', ...elements] = args
    const list = store.getOrCreate(key, 'list')

    // Each element is pushed to the head in turn, like Redis does.
    list.unshift(...elements.reverse())

    return list.length
  },

  mget(store, args) {
    checkArity('mget', args, 1)

    return args.map((key) => {
      const value = store.get(key)

      // MGET replies nil for a key of another type instead of an error.
      return value?.type === 'string' ? value.value : null
    })
  },

  ping(_store, args) {
    checkArity('ping', args, 0, 1)

    return args[0] ?? 'PONG'
  },

  rpop(store, args) {
    checkArity('rpop', args, 1, 2)

    const [key = '', countText] = args
    const list = store.getOf(key, 'list')

    if (countText !== undefined) {
      const count = parseInteger(countText)
      if (count < 0) {
        throw new RedisError('ERR value is out of range, must be positive')
      }

      const popped = list
        ? list.splice(Math.max(0, list.length - count)).reverse()
        : null

      store.deleteIfEmpty(key)

      return popped
    }

    const popped = list?.pop() ?? null

    store.deleteIfEmpty(key)

    return popped
  },

  sadd(store, args) {
    checkArity('sadd', args, 2)

    const [key = '', ...members] = args
    const members_ = store.getOrCreate(key, 'set')
    const before = members_.size

    for (const member of members) {
      members_.add(member)
    }

    return members_.size - before
  },

  scard(store, args) {
    checkArity('scard', args, 1, 1)

    return store.getOf(args[0] ?? '', 'set')?.size ?? 0
  },

  set,

  setex(store, args) {
    checkArity('setex', args, 3, 3)

    const [key = '', seconds = '', value = ''] = args

    if (parseInteger(seconds) <= 0) {
      throw new RedisError("ERR invalid expire time in 'setex' command")
    }

    return set(store, [key, value, 'EX', seconds])
  },

  smembers(store, args) {
    checkArity('smembers', args, 1, 1)

    return [...(store.getOf(args[0] ?? '', 'set') ?? [])]
  },

  srem(store, args) {
    checkArity('srem', args, 2)

    const [key = '', ...members] = args
    const current = store.getOf(key, 'set')
    const removed = current
      ? members.filter((member) => current.delete(member)).length
      : 0

    store.deleteIfEmpty(key)

    return removed
  },

  ttl(store, args) {
    checkArity('ttl', args, 1, 1)

    const key = args[0] ?? ''

    if (!store.has(key)) {
      return -2
    }

    const expiresAt = store.getExpiry(key)

    return expiresAt
      ? Math.round(
          Temporal.Now.instant().until(expiresAt).total('milliseconds') / 1000,
        )
      : -1
  },

  zadd,

  zcard(store, args) {
    checkArity('zcard', args, 1, 1)

    return store.getOf(args[0] ?? '', 'zset')?.size ?? 0
  },

  zincrby(store, args) {
    checkArity('zincrby', args, 3, 3)

    const [key = '', increment, member = ''] = args
    const zset = store.getOrCreate(key, 'zset')
    const score = (zset.get(member) ?? 0) + parseScore(increment)

    zset.set(member, score)

    return formatScore(score)
  },

  zrange,

  zscore(store, args) {
    checkArity('zscore', args, 2, 2)

    const score = store.getOf(args[0] ?? '', 'zset')?.get(args[1] ?? '')

    return score === undefined ? null : formatScore(score)
  },

  zunionstore,
}

/** The names of the commands that the mock supports. */
export const SUPPORTED_COMMANDS = Object.keys(COMMANDS)

/**
 * The error of Redis for a command that it does not know, such as
 * `ERR unknown command 'foo', with args beginning with: 'a' `.
 */
export function unknownCommandError(
  name: string,
  args: readonly unknown[],
): RedisError {
  const beginning = args
    .slice(0, 20)
    .map((arg) => `'${String(arg)}' `)
    .join('')

  return new RedisError(
    `ERR unknown command '${name}', with args beginning with: ${beginning}`,
  )
}

/** Whether the mock supports a command (case-insensitive). */
export function isSupportedCommand(name: string): boolean {
  return Object.hasOwn(COMMANDS, name.toLowerCase())
}

/**
 * Run a command, such as `['ZINCRBY', 'key', 1, 'member']`. The arguments
 * are strings for Redis, so numbers are converted like Upstash does. An
 * error of Redis is thrown as a `RedisError`.
 */
export function runCommand(
  store: MockRedisStore,
  [name, ...args]: readonly unknown[],
): RedisReply {
  if (typeof name !== 'string' || name === '') {
    throw new RedisError('ERR empty command')
  }

  if (!isSupportedCommand(name)) {
    throw unknownCommandError(name, args)
  }

  const handler = COMMANDS[name.toLowerCase()] as CommandHandler

  return handler(
    store,
    args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))),
  )
}
