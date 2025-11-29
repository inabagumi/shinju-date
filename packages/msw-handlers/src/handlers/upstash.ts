// biome-ignore-all lint/suspicious/noExplicitAny: Mocking Redis with any type for simplicity

import { HttpResponse, http } from 'msw'
import { createRedisDataFactory } from '../factories/index.js'

/**
 * Mock Redis store using factory-generated data
 *
 * Benefits of using factories:
 * - Reduced boilerplate: Factory handles data generation logic
 * - Realistic data: Faker generates diverse, realistic values
 * - Easy customization: Override factory data as needed
 * - Maintainability: Update data generation in factory, not here
 */

// Generate Redis data using factory (last 7 days)
const mockRedisStore = createRedisDataFactory(7)

console.log(
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
  const data = (mockRedisStore.get(key) as Array<{ member: string; score: number }>) || []
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
    const data = (mockRedisStore.get(key) as Array<{ member: string; score: number }>) || []
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

      // Parse options
      for (let i = 0; i < options.length; i++) {
        if (options[i] === 'REV') opts.rev = true
        if (options[i] === 'WITHSCORES') opts.withScores = true
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

    case 'set': {
      const [key, value] = args
      mockRedisStore.set(key, value)
      return { result: 'OK' }
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
      const set = (mockRedisStore.get(key) as Set<any>) || new Set()
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
      const set = (mockRedisStore.get(key) as Set<any>) || new Set()
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
