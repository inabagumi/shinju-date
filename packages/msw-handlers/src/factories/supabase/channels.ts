import { faker } from '@faker-js/faker'
import type { Tables } from '@shinju-date/database'

/**
 * Factory for generating mock YouTube Channel data
 */
export function createChannelFactory(
  overrides: Partial<Tables<'youtube_channels'>> = {},
): Tables<'youtube_channels'> {
  const channelName = faker.helpers.arrayElement([
    `${faker.word.adjective()} ${faker.word.noun()} Channel`,
    `${faker.company.buzzAdjective()} ${faker.company.buzzNoun()}`,
    `${faker.person.firstName()}'s Channel`,
  ])

  return {
    id: faker.string.uuid(),
    name: channelName,
    talent_id: faker.string.uuid(),
    youtube_channel_id: `UC${faker.string.alphanumeric(22)}`,
    youtube_handle: `@${faker.internet.username().toLowerCase()}`,
    ...overrides,
  }
}

export function createManyChannels(
  count: number,
  overrides: Partial<Tables<'youtube_channels'>> = {},
): Tables<'youtube_channels'>[] {
  return Array.from({ length: count }, () => createChannelFactory(overrides))
}
