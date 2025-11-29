import { faker } from '@faker-js/faker'
import type { Tables } from '@shinju-date/database'

/**
 * Factory for generating mock Video data
 *
 * @example
 * // Generate a single video with default values
 * const video = createVideoFactory()
 *
 * @example
 * // Generate a video with custom fields
 * const video = createVideoFactory({ title: 'Custom Title', visible: false })
 *
 * @example
 * // Generate multiple videos
 * const videos = Array.from({ length: 10 }, () => createVideoFactory())
 */
export function createVideoFactory(
  overrides: Partial<Tables<'videos'>> = {},
): Tables<'videos'> {
  const now = new Date().toISOString()

  return {
    created_at: faker.date.past({ years: 1 }).toISOString(),
    deleted_at: faker.helpers.arrayElement([
      null,
      null,
      null,
      null,
      faker.date.recent({ days: 7 }).toISOString(),
    ]), // 80% chance of null
    duration: faker.helpers.arrayElement([
      'PT5M30S',
      'PT10M15S',
      'PT15M45S',
      'PT20M30S',
      'PT8M22S',
      'PT12M18S',
    ]),
    id: faker.string.uuid(),
    platform: null,
    published_at: faker.date.past({ years: 1 }).toISOString(),
    status: faker.helpers.arrayElement([
      'PUBLISHED',
      'LIVE',
      'ENDED',
      'UPCOMING',
    ]),
    talent_id: faker.string.uuid(),
    thumbnail_id: faker.string.uuid(),
    title: faker.helpers.arrayElement([
      `${faker.word.adjective()} ${faker.word.noun()} Video`,
      `${faker.company.buzzAdjective()} ${faker.company.buzzNoun()}`,
      `How to ${faker.hacker.verb()} ${faker.hacker.noun()}`,
      `${faker.number.int({ max: 100, min: 1 })} Ways to ${faker.hacker.verb()}`,
      `${faker.word.adjective()} Tutorial #${faker.number.int({ max: 100, min: 1 })}`,
    ]),
    updated_at: now,
    visible: faker.helpers.arrayElement([true, true, true, false]), // 75% visible
    ...overrides,
  }
}

/**
 * Generate multiple videos with sequential or random data
 *
 * @example
 * // Generate 10 videos
 * const videos = createManyVideos(10)
 *
 * @example
 * // Generate 5 videos with the same talent_id
 * const talentId = faker.string.uuid()
 * const videos = createManyVideos(5, { talent_id: talentId })
 */
export function createManyVideos(
  count: number,
  overrides: Partial<Tables<'videos'>> = {},
): Tables<'videos'>[] {
  return Array.from({ length: count }, () => createVideoFactory(overrides))
}
