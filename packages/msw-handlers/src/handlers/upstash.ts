// biome-ignore-all lint/suspicious/noExplicitAny: Mocking Redis with any type for simplicity

import { HttpResponse, http } from 'msw'
import { Temporal } from 'temporal-polyfill'

// Mock Redis store
const mockRedisStore = new Map<string, any>()

// Initialize with some sample data based on the Redis keys used in the app
const initializeRedisData = () => {
  // Get current date range for testing (last 7 days)
  const today = Temporal.Now.plainDateISO()
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const date = today.subtract({ days: i })
    const dateStr = date.toString().replace(/-/g, '') // YYYYMMDD format
    dates.push(dateStr)
  }

  // Create differentiated data for each date to test single-date filtering
  dates.forEach((dateStr, index) => {
    // Video click data - different for each day
    mockRedisStore.set(`videos:clicked:${dateStr}`, [
      { member: '1', score: 100 + index * 10 }, // Video 1: 100, 110, 120, etc.
      { member: '2', score: 80 + index * 8 }, // Video 2: 80, 88, 96, etc.
      { member: '3', score: 60 + index * 6 }, // Video 3: 60, 66, 72, etc.
      { member: '4', score: 40 + index * 4 }, // Video 4: 40, 44, 48, etc.
      { member: '5', score: 20 + index * 2 }, // Video 5: 20, 22, 24, etc.
    ])

    // Channel click data - different for each day
    mockRedisStore.set(`channels:clicked:${dateStr}`, [
      { member: '1', score: 200 + index * 20 }, // Channel 1: 200, 220, 240, etc.
      { member: '2', score: 150 + index * 15 }, // Channel 2: 150, 165, 180, etc.
      { member: '3', score: 100 + index * 10 }, // Channel 3: 100, 110, 120, etc.
      { member: '4', score: 50 + index * 5 }, // Channel 4: 50, 55, 60, etc.
    ])

    // Search keyword data - different for each day
    mockRedisStore.set(`search:popular:daily:${dateStr}`, [
      { member: `Keyword Day ${index + 1}`, score: 50 + index * 10 },
      { member: `Search Term ${index + 1}`, score: 30 + index * 5 },
      { member: `Query ${index + 1}`, score: 20 + index * 3 },
      { member: `Test ${index + 1}`, score: 10 + index * 2 },
    ])

    // Search volume data
    mockRedisStore.set(`search:volume:${dateStr}`, 100 + index * 20)

    // Summary stats data - trending upward over time
    mockRedisStore.set(`summary:stats:${dateStr}`, {
      deletedVideos: 50 + index * 0,
      hiddenVideos: 150 + index * 1,
      totalTalents: 50 + index * 0,
      totalTerms: 200 + index * 2,
      totalVideos: 1000 + index * 5,
      visibleVideos: 800 + index * 4,
    })
  })

  // Add some aggregate cache data for date ranges
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]

  // Multi-day cache for videos (sum of all daily data)
  mockRedisStore.set(`cache:popular_items:videos:${firstDate}/${lastDate}`, [
    { member: '1', score: 1050 }, // Sum of all video 1 scores
    { member: '2', score: 748 }, // Sum of all video 2 scores
    { member: '3', score: 462 }, // Sum of all video 3 scores
    { member: '4', score: 292 }, // Sum of all video 4 scores
    { member: '5', score: 154 }, // Sum of all video 5 scores
  ])

  // Multi-day cache for channels
  mockRedisStore.set(`cache:popular_items:channels:${firstDate}/${lastDate}`, [
    { member: '1', score: 1820 }, // Sum of all channel 1 scores
    { member: '2', score: 1260 }, // Sum of all channel 2 scores
    { member: '3', score: 770 }, // Sum of all channel 3 scores
    { member: '4', score: 385 }, // Sum of all channel 4 scores
  ])

  // Zero result keywords
  mockRedisStore.set('search:zero_results', [
    'nonexistent keyword',
    'missing content',
    'not found term',
  ])

  // Sample status data
  mockRedisStore.set(
    'status:last_video_sync',
    Temporal.Now.instant().toString(),
  )

  console.log('🎯 MSW Redis mock data initialized with dates:', dates)
}

// Initialize sample data
initializeRedisData()

/**
 * Simulate Redis ZRANGE operation
 */
function simulateZRange(
  key: string,
  start: number,
  stop: number,
  options: { rev?: boolean; withScores?: boolean } = {},
) {
  const data = mockRedisStore.get(key) || []
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
    const data = mockRedisStore.get(key) || []
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

export const upstashHandlers = [
  // Upstash Redis REST API pipeline endpoint (without version in path)
  http.post('https://fake.upstash.test/pipeline', async ({ request }) => {
    const commands = (await request.json()) as any[]
    const results = []

    for (const commandBody of commands) {
      const { command, args } = parseUpstashCommand(commandBody)

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
          results.push({ result })
          break
        }

        case 'zunionstore': {
          const [destKey, numKeys, ...keysAndArgs] = args
          const keys = keysAndArgs.slice(0, parseInt(numKeys, 10))
          const result = simulateZUnionStore(destKey, keys)
          results.push({ result })
          break
        }

        case 'expire': {
          const [_key, _seconds] = args
          // For mock purposes, we'll just return success
          results.push({ result: 1 })
          break
        }

        case 'ping': {
          results.push({ result: 'PONG' })
          break
        }

        case 'get': {
          const [key] = args
          const value = mockRedisStore.get(key)
          results.push({ result: value || null })
          break
        }

        case 'set': {
          const [key, value] = args
          mockRedisStore.set(key, value)
          results.push({ result: 'OK' })
          break
        }

        case 'del': {
          const keys = args
          let deletedCount = 0
          for (const key of keys) {
            if (mockRedisStore.delete(key)) {
              deletedCount += 1
            }
          }
          results.push({ result: deletedCount })
          break
        }

        default:
          results.push({ result: null })
          break
      }
    }

    return HttpResponse.json(results)
  }),

  // Upstash Redis REST API pipeline endpoint (with version in path)
  http.post('https://fake.upstash.test/v2/*/pipeline', async ({ request }) => {
    const commands = (await request.json()) as any[]
    const results = []

    for (const commandBody of commands) {
      const { command, args } = parseUpstashCommand(commandBody)

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
          results.push({ result })
          break
        }

        case 'zunionstore': {
          const [destKey, numKeys, ...keysAndArgs] = args
          const keys = keysAndArgs.slice(0, parseInt(numKeys, 10))
          const result = simulateZUnionStore(destKey, keys)
          results.push({ result })
          break
        }

        case 'expire': {
          const [_key, _seconds] = args
          // For mock purposes, we'll just return success
          results.push({ result: 1 })
          break
        }

        case 'ping': {
          results.push({ result: 'PONG' })
          break
        }

        case 'get': {
          const [key] = args
          const value = mockRedisStore.get(key)
          results.push({ result: value || null })
          break
        }

        case 'set': {
          const [key, value] = args
          mockRedisStore.set(key, value)
          results.push({ result: 'OK' })
          break
        }

        case 'del': {
          const keys = args
          let deletedCount = 0
          for (const key of keys) {
            if (mockRedisStore.delete(key)) {
              deletedCount += 1
            }
          }
          results.push({ result: deletedCount })
          break
        }

        default:
          results.push({ result: null })
          break
      }
    }

    return HttpResponse.json(results)
  }),

  // Single command endpoint
  http.post('https://fake.upstash.test/v2/*', async ({ request }) => {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const commandPart = pathParts[pathParts.length - 1]
    const command = commandPart ? commandPart.toLowerCase() : ''

    const body = await request.json()
    const args = Array.isArray(body) ? body : []

    if (!command) {
      return HttpResponse.json({ result: null })
    }

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
        return HttpResponse.json({ result })
      }

      case 'ping': {
        return HttpResponse.json({ result: 'PONG' })
      }

      case 'get': {
        const [key] = args
        const value = mockRedisStore.get(key)
        return HttpResponse.json({ result: value || null })
      }

      case 'set': {
        const [key, value] = args
        mockRedisStore.set(key, value)
        return HttpResponse.json({ result: 'OK' })
      }

      default:
        return HttpResponse.json({ result: null })
    }
  }),
]
