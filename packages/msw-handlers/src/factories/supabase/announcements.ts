import { faker } from '@faker-js/faker'
import type { Tables } from '@shinju-date/database'

/**
 * Factory for generating mock Announcement data
 */
export function createAnnouncementFactory(
  overrides: Partial<Tables<'announcements'>> = {},
): Tables<'announcements'> {
  const now = new Date().toISOString()
  const level = faker.helpers.arrayElement([
    'info',
    'warning',
    'error',
  ] as const)

  const messageTemplates = [
    `## ${faker.company.buzzPhrase()}\n\n${faker.lorem.paragraphs(2)}`,
    `### ${faker.hacker.phrase()}\n\n- ${faker.lorem.sentence()}\n- ${faker.lorem.sentence()}\n- ${faker.lorem.sentence()}`,
    `**${faker.word.adjective()} ${faker.word.noun()}**\n\n${faker.lorem.paragraph()}`,
  ]

  return {
    created_at: faker.date.past({ years: 1 }).toISOString(),
    enabled: faker.datatype.boolean(),
    end_at: faker.date.future({ years: 1 }).toISOString(),
    id: faker.string.uuid(),
    level,
    message: faker.helpers.arrayElement(messageTemplates),
    start_at: faker.date.recent({ days: 7 }).toISOString(),
    updated_at: now,
    ...overrides,
  }
}

export function createManyAnnouncements(
  count: number,
  overrides: Partial<Tables<'announcements'>> = {},
): Tables<'announcements'>[] {
  return Array.from({ length: count }, () =>
    createAnnouncementFactory(overrides),
  )
}
