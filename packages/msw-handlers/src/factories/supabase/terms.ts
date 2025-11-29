import { faker } from '@faker-js/faker'
import type { Tables } from '@shinju-date/database'

/**
 * Factory for generating mock Term data
 */
export function createTermFactory(
  overrides: Partial<Tables<'terms'>> = {},
): Tables<'terms'> {
  const now = new Date().toISOString()
  const term = faker.word.words({ count: { max: 3, min: 1 } })

  return {
    created_at: faker.date.past({ years: 1 }).toISOString(),
    id: faker.string.uuid(),
    readings: Array.from({ length: faker.number.int({ max: 3, min: 1 }) }, () =>
      faker.word.sample(),
    ),
    synonyms: Array.from({ length: faker.number.int({ max: 4, min: 1 }) }, () =>
      faker.word.words({ count: { max: 2, min: 1 } }),
    ),
    term,
    updated_at: now,
    ...overrides,
  }
}

export function createManyTerms(
  count: number,
  overrides: Partial<Tables<'terms'>> = {},
): Tables<'terms'>[] {
  return Array.from({ length: count }, () => createTermFactory(overrides))
}
