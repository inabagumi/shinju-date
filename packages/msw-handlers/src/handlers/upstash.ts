import { HttpResponse, http } from 'msw'

// Mock Redis store
const mockRedisStore = new Map<string, any>()

// Initialize with some sample data based on the Redis keys used in the app
const initializeRedisData = () => {
  // Sample click data for videos (sorted sets)
  mockRedisStore.set('videos:clicked:2023-10-23', [
    { member: '1', score: 150 },
    { member: '2', score: 120 },
  ])

  // Sample click data for channels (sorted sets)
  mockRedisStore.set('channels:clicked:2023-10-23', [
    { member: '1', score: 200 },
    { member: '2', score: 180 },
  ])

  // Sample search data
  mockRedisStore.set('search:popular:daily:2023-10-23', [
    { member: 'ホロライブ', score: 50 },
    { member: 'にじさんじ', score: 30 },
  ])

  // Sample cache data
  mockRedisStore.set('cache:popular_items:videos:2023-10-23/2023-10-23', [
    { member: '1', score: 150 },
    { member: '2', score: 120 },
  ])

  // Sample status data
  mockRedisStore.set('status:last_video_sync', '2023-10-23T12:00:00.000Z')
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
  // Upstash Redis REST API endpoint
  http.post('*/v2/*/pipeline', async ({ request }) => {
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

        default:
          results.push({ result: null })
          break
      }
    }

    return HttpResponse.json(results)
  }),

  // Single command endpoint
  http.post('*/v2/*', async ({ request }) => {
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
