import { faker } from '@faker-js/faker'
import type { Tables } from '@shinju-date/database'

/**
 * Factory for generating mock Talent data
 */
export function createTalentFactory(
  overrides: Partial<Tables<'talents'>> = {},
): Tables<'talents'> {
  const now = new Date().toISOString()

  return {
    created_at: faker.date.past({ years: 2 }).toISOString(),
    deleted_at: faker.helpers.arrayElement([null, null, null, null, null]), // 99% chance of null
    id: faker.string.uuid(),
    name: faker.helpers.arrayElement([
      faker.person.fullName(),
      `${faker.word.adjective()} ${faker.animal.type()}`,
      `${faker.color.human()} ${faker.word.noun()}`,
    ]),
    updated_at: now,
    ...overrides,
  }
}

export function createManyTalents(
  count: number,
  overrides: Partial<Tables<'talents'>> = {},
): Tables<'talents'>[] {
  return Array.from({ length: count }, () => createTalentFactory(overrides))
}
