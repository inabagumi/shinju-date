import { faker } from '@faker-js/faker'
import { Temporal } from 'temporal-polyfill'

/**
 * Factory for generating mock Redis sorted set data
 */
export function createRedisSortedSetItem(
  overrides: { member?: string; score?: number } = {},
) {
  return {
    member: faker.string.uuid(),
    score: faker.number.int({ max: 1000, min: 1 }),
    ...overrides,
  }
}

/**
 * Generate Redis click tracking data for a date range
 *
 * @param dateCount Number of days to generate data for
 * @returns Object with Redis keys and their values
 */
export function createRedisDataFactory(dateCount = 7) {
  const today = Temporal.Now.plainDateISO()
  const redisData = new Map<string, unknown>()

  // Generate data for the date range
  for (let i = dateCount - 1; i >= 0; i--) {
    const date = today.subtract({ days: i })
    const dateStr = date.toString().replace(/-/g, '') // YYYYMMDD format
    const dayIndex = dateCount - 1 - i // For trending data

    // Video click data - different for each day
    const videoClicks = Array.from({ length: 5 }, (_, idx) => ({
      member: `${idx + 1}`,
      score: faker.number.int({ max: 200, min: 20 }) + dayIndex * 10,
    }))
    redisData.set(`videos:clicked:${dateStr}`, videoClicks)

    // Channel click data
    const channelClicks = Array.from({ length: 4 }, (_, idx) => ({
      member: `${idx + 1}`,
      score: faker.number.int({ max: 300, min: 50 }) + dayIndex * 20,
    }))
    redisData.set(`channels:clicked:${dateStr}`, channelClicks)

    // Search keyword data
    const searchKeywords = Array.from({ length: 4 }, (_, _idx) => ({
      member: faker.word.words({ count: { max: 3, min: 1 } }),
      score: faker.number.int({ max: 100, min: 10 }) + dayIndex * 5,
    }))
    redisData.set(`search:popular:daily:${dateStr}`, searchKeywords)

    // Search volume data
    redisData.set(
      `search:volume:${dateStr}`,
      faker.number.int({ max: 500, min: 100 }) + dayIndex * 20,
    )

    // Summary stats data
    redisData.set(`summary:stats:${dateStr}`, {
      deletedVideos: faker.number.int({ max: 100, min: 10 }),
      hiddenVideos: faker.number.int({ max: 200, min: 50 }),
      totalTalents: faker.number.int({ max: 100, min: 30 }),
      totalTerms: faker.number.int({ max: 500, min: 100 }),
      totalVideos: faker.number.int({ max: 2000, min: 500 }),
      visibleVideos: faker.number.int({ max: 1500, min: 400 }),
    })
  }

  // Zero result keywords
  redisData.set(
    'search:zero_results',
    Array.from({ length: 3 }, () =>
      faker.word.words({ count: { max: 3, min: 2 } }),
    ),
  )

  // Status data
  redisData.set('status:last_video_sync', Temporal.Now.instant().toString())

  return redisData
}

/**
 * Create custom Redis data with specific keys
 */
export function createCustomRedisData(
  customData: Record<string, unknown>,
): Map<string, unknown> {
  return new Map(Object.entries(customData))
}
