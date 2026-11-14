// biome-ignore-all lint/suspicious/noExplicitAny: Mocking Redis with any type for simplicity

import { HttpResponse, http } from 'msw'
import { createRedisDataFactory } from '../redis-factory.js'

/**
 * Mock Redis store using factory-generated data
 *
 * Benefits of using @faker-js/faker:
 * - Reduced boilerplate: Factory handles data generation logic
 * - Realistic data: Faker generates diverse, realistic values
 * - Easy customization: Override factory data as needed
 * - Maintainability: Update data generation in factory, not here
 */

// Generate Redis data using factory (last 7 days)
const mockRedisStore = createRedisDataFactory(7)

console.error(
  '🎯 MSW Redis mock data initialized with dates:',
  Array.from(mockRedisStore.keys())
    .filter((key) => key.includes(':clicked:'))
    .map((key) => key.split(':').pop())
    .filter((date, idx, arr) => arr.indexOf(date) === idx)
    .sort(),
)

/**
 * Simulate Redis ZRANGE operation
 */
function simulateZRange(
  key: string,
  start: number,
  stop: number,
  options: { rev?: boolean; withScores?: boolean } = {},
) {
  const rawData = mockRedisStore.get(key)
  // Type guard: ensure data is an array of sorted set items
  const data = Array.isArray(rawData) ? rawData : []
  const sortedData = [...data]

  // Sort by score
  sortedData.sort((a, b) =>
    options.rev ? b.score - a.score : a.score - b.score,
  )

  // Apply range
  const rangeData = sortedData.slice(start, stop === -1 ? undefined : stop + 1)

  if (options.withScores) {
    // Return [member, score, member, score, ...]
    const result: (string | number)[] = []
    for (const item of rangeData) {
      result.push(item.member, item.score)
    }
    return result
  } else {
    // Return [member, member, ...]
    return rangeData.map((item) => item.member)
  }
}

/**
 * Simulate Redis ZUNIONSTORE operation
 */
function simulateZUnionStore(destKey: string, keys: string[]) {
  const unionData = new Map<string, number>()

  for (const key of keys) {
    const rawData = mockRedisStore.get(key)
    // Type guard: ensure data is an array
    const data = Array.isArray(rawData) ? rawData : []
    for (const item of data) {
      const currentScore = unionData.get(item.member) || 0
      unionData.set(item.member, currentScore + item.score)
    }
  }

  const result = Array.from(unionData.entries()).map(([member, score]) => ({
    member,
    score,
  }))
  mockRedisStore.set(destKey, result)

  return result.length
}

/**
 * Simulate `ENQUEUE_SCRIPT` of `@shinju-date/video-backfill`: saves and queues
 * a job only if it is unchanged since it was read and no worker holds it.
 */
function simulateBackfillEnqueue(keys: any[], argv: any[]): number {
  const [jobKey, queueKey, lockKey] = keys
  const [expected, job, , id] = argv
  const current = mockRedisStore.get(jobKey)

  if (expected === '' ? current !== undefined : current !== expected) {
    return 0
  }

  if (mockRedisStore.has(lockKey)) {
    return 0
  }

  mockRedisStore.set(jobKey, job)

  const rawList = mockRedisStore.get(queueKey)
  const list = Array.isArray(rawList) ? rawList : []

  list.unshift(id)
  mockRedisStore.set(queueKey, list)

  return 1
}

/**
 * Simulate `REQUEUE_SCRIPT` of `@shinju-date/video-backfill`: puts a claimed
 * job back in the queue as pending and releases it.
 */
function simulateBackfillRequeue(keys: any[], argv: any[]): number {
  const [queueKey, jobKey, lockKey] = keys
  const [id, job] = argv
  const rawList = mockRedisStore.get(queueKey)
  const list = Array.isArray(rawList) ? rawList : []

  list.unshift(id)
  mockRedisStore.set(queueKey, list)
  mockRedisStore.set(jobKey, job)
  mockRedisStore.delete(lockKey)

  return 1
}

/**
 * Simulate `RUN_UNLOCK_SCRIPT` of `@shinju-date/video-backfill`: deletes the
 * lock of a request for a check only if it still holds the request's token.
 */
function simulateBackfillRunUnlock(keys: any[], argv: any[]): number {
  const [lockKey] = keys
  const [token] = argv

  if (mockRedisStore.get(lockKey) !== token) {
    return 0
  }

  mockRedisStore.delete(lockKey)

  return 1
}

/**
 * Parse Upstash Redis REST API command
 */
function parseUpstashCommand(body: any) {
  if (Array.isArray(body)) {
    const [command, ...args] = body
    return { args, command: command.toLowerCase() }
  }
  return { args: [], command: '' }
}

/**
 * Process a single Redis command and return the result
 */
function processRedisCommand(command: string, args: any[]): any {
  switch (command) {
    case 'zrange': {
      const [key, start, stop, ...options] = args
      const opts: any = {}

      // Parse options. Redis options are case-insensitive, and
      // `@upstash/redis` sends them in lowercase.
      for (const option of options) {
        const normalizedOption = String(option).toLowerCase()

        if (normalizedOption === 'rev') opts.rev = true
        if (normalizedOption === 'withscores') opts.withScores = true
      }

      const result = simulateZRange(
        key,
        parseInt(start, 10),
        parseInt(stop, 10),
        opts,
      )
      return { result }
    }

    case 'zunionstore': {
      const [destKey, numKeys, ...keysAndArgs] = args
      const keys = keysAndArgs.slice(0, parseInt(numKeys, 10))
      const result = simulateZUnionStore(destKey, keys)
      return { result }
    }

    case 'expire': {
      // For mock purposes, we'll just return success
      return { result: 1 }
    }

    case 'ping': {
      return { result: 'PONG' }
    }

    case 'get': {
      const [key] = args
      const value = mockRedisStore.get(key)
      return { result: value || null }
    }

    case 'mget': {
      return { result: args.map((key) => mockRedisStore.get(key) ?? null) }
    }

    case 'set': {
      const [key, value, ...options] = args
      const onlyIfMissing = options.some(
        (option) => String(option).toLowerCase() === 'nx',
      )

      if (onlyIfMissing && mockRedisStore.has(key)) {
        return { result: null }
      }

      mockRedisStore.set(key, value)
      return { result: 'OK' }
    }

    case 'eval': {
      // Lua cannot run here, so known scripts are emulated.
      const [script, numKeys, ...rest] = args
      const keys = rest.slice(0, Number(numKeys))
      const argv = rest.slice(Number(numKeys))

      if (String(script).includes('-- video-backfill:enqueue')) {
        return { result: simulateBackfillEnqueue(keys, argv) }
      }

      if (String(script).includes('-- video-backfill:requeue')) {
        return { result: simulateBackfillRequeue(keys, argv) }
      }

      if (String(script).includes('-- video-backfill:run-unlock')) {
        return { result: simulateBackfillRunUnlock(keys, argv) }
      }

      return { result: null }
    }

    case 'lpush': {
      const [key, ...elements] = args
      const rawList = mockRedisStore.get(key)
      const list = Array.isArray(rawList) ? rawList : []

      // Each element is pushed to the head in turn, like Redis does.
      list.unshift(...elements.reverse())
      mockRedisStore.set(key, list)
      return { result: list.length }
    }

    case 'rpop': {
      const [key] = args
      const rawList = mockRedisStore.get(key)
      const list = Array.isArray(rawList) ? rawList : []
      return { result: list.pop() ?? null }
    }

    case 'del': {
      const keys = args
      let deletedCount = 0
      for (const key of keys) {
        if (mockRedisStore.delete(key)) {
          deletedCount += 1
        }
      }
      return { result: deletedCount }
    }

    case 'sadd': {
      const [key, ...members] = args
      const rawSet = mockRedisStore.get(key)
      // Type guard: ensure it's a Set
      const set =
        rawSet instanceof Set ? (rawSet as Set<string>) : new Set<string>()
      let addedCount = 0
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member)
          addedCount += 1
        }
      }
      mockRedisStore.set(key, set)
      return { result: addedCount }
    }

    case 'smembers': {
      const [key] = args
      const rawSet = mockRedisStore.get(key)
      // Type guard: ensure it's a Set
      const set = rawSet instanceof Set ? rawSet : new Set()
      return { result: Array.from(set) }
    }

    default:
      return { result: null }
  }
}

export const upstashHandlers = [
  // Upstash Redis REST API pipeline endpoint (without version in path)
  http.post('https://fake.upstash.test/pipeline', async ({ request }) => {
    const commands = (await request.json()) as any[]
    const results = commands.map((commandBody) => {
      const { command, args } = parseUpstashCommand(commandBody)
      return processRedisCommand(command, args)
    })
    return HttpResponse.json(results)
  }),

  // Upstash Redis REST API pipeline endpoint (with version in path)
  http.post('https://fake.upstash.test/v2/*/pipeline', async ({ request }) => {
    const commands = (await request.json()) as any[]
    const results = commands.map((commandBody) => {
      const { command, args } = parseUpstashCommand(commandBody)
      return processRedisCommand(command, args)
    })
    return HttpResponse.json(results)
  }),

  // Multi-exec endpoint (transactional commands)
  http.post('https://fake.upstash.test/multi-exec', async ({ request }) => {
    const commands = (await request.json()) as any[]
    const results = commands.map((commandBody) => {
      const { command, args } = parseUpstashCommand(commandBody)
      return processRedisCommand(command, args)
    })
    return HttpResponse.json(results)
  }),

  // Root endpoint - handles single command sent as array
  http.post('https://fake.upstash.test/', async ({ request }) => {
    const body = (await request.json()) as any
    const { command, args } = parseUpstashCommand(body)
    return HttpResponse.json(processRedisCommand(command, args))
  }),

  // Single command endpoint
  http.post('https://fake.upstash.test/v2/*', async ({ request }) => {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const commandPart = pathParts[pathParts.length - 1]
    const command = commandPart ? commandPart.toLowerCase() : ''

    if (!command) {
      return HttpResponse.json({ result: null })
    }

    const body = await request.json()
    const args = Array.isArray(body) ? body : []

    return HttpResponse.json(processRedisCommand(command, args))
  }),
]
