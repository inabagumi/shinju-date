/**
 * Redis mock data factory using @faker-js/faker
 * Generates realistic Redis data structures for testing
 */
import { faker } from '@faker-js/faker'

interface SortedSetItem {
  member: string
  score: number
}

/**
 * Create Redis mock data with realistic values
 * Generates click tracking and search keyword data for N days
 *
 * @param dateCount Number of days to generate data for
 * @returns Map of Redis keys to their values
 */
export function createRedisDataFactory(
  dateCount: number,
): Map<string, SortedSetItem[] | Set<string>> {
  const store = new Map<string, SortedSetItem[] | Set<string>>()
  const now = new Date()

  // Generate data for each day
  for (let i = 0; i < dateCount; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]?.replace(/-/g, '') ?? ''

    // Videos clicked data (sorted set with scores)
    const videosClicked: SortedSetItem[] = Array.from(
      { length: faker.number.int({ max: 15, min: 5 }) },
      () => ({
        member: faker.string.uuid(),
        score: faker.number.int({ max: 100, min: 1 }),
      }),
    )
    store.set(`videos:clicked:${dateKey}`, videosClicked)

    // Search keywords data (set of strings)
    const searchKeywords = new Set<string>()
    for (let j = 0; j < faker.number.int({ max: 10, min: 3 }); j++) {
      searchKeywords.add(
        faker.helpers.arrayElement([
          '歌枠',
          'ゲーム配信',
          'ASMR',
          'コラボ',
          'Minecraft',
          'APEX',
          '雑談',
        ]),
      )
    }
    store.set(`search:keywords:${dateKey}`, searchKeywords)
  }

  return store
}
