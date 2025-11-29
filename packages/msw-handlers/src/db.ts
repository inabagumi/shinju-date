/**
 * Mock database using @mswjs/data
 *
 * This creates a structured database with proper relationships using @mswjs/data.
 * Integrated with @faker-js/faker for realistic, diverse test data.
 *
 * Benefits:
 * - Structured data modeling with relationships
 * - Built-in query methods (findMany, findFirst, etc.)
 * - Automatic ID generation
 * - Type-safe operations
 */

import { faker } from '@faker-js/faker'
import { factory, nullable, primaryKey } from '@mswjs/data'

/**
 * Create the mock database with all tables
 * Using @mswjs/data factory with faker for realistic data
 */
export const db = factory({
  // Announcements table
  announcements: {
    created_at: () => faker.date.past({ years: 1 }).toISOString(),
    enabled: () => faker.datatype.boolean(),
    end_at: () => faker.date.future({ years: 1 }).toISOString(),
    id: primaryKey(faker.string.uuid),
    level: () =>
      faker.helpers.arrayElement(['info', 'warning', 'error'] as const),
    message: () => {
      const templates = [
        `## ${faker.company.buzzPhrase()}\n\n${faker.lorem.paragraphs(2)}`,
        `### ${faker.hacker.phrase()}\n\n- ${faker.lorem.sentence()}\n- ${faker.lorem.sentence()}\n- ${faker.lorem.sentence()}`,
        `**${faker.word.adjective()} ${faker.word.noun()}**\n\n${faker.lorem.paragraph()}`,
      ]
      return faker.helpers.arrayElement(templates)
    },
    start_at: () => faker.date.recent({ days: 7 }).toISOString(),
    updated_at: () => new Date().toISOString(),
  },
  // Talents table
  talents: {
    created_at: () => faker.date.past({ years: 2 }).toISOString(),
    deleted_at: nullable(() => null),
    id: primaryKey(faker.string.uuid),
    name: () => faker.person.fullName(),
    updated_at: () => new Date().toISOString(),
  },

  // Terms table
  terms: {
    created_at: () => faker.date.past({ years: 1 }).toISOString(),
    id: primaryKey(faker.string.uuid),
    readings: () =>
      Array.from({ length: faker.number.int({ max: 3, min: 1 }) }, () =>
        faker.word.sample(),
      ),
    synonyms: () =>
      Array.from({ length: faker.number.int({ max: 4, min: 1 }) }, () =>
        faker.word.words({ count: { max: 2, min: 1 } }),
      ),
    term: () => faker.word.words({ count: { max: 3, min: 1 } }),
    updated_at: () => new Date().toISOString(),
  },

  // Thumbnails table
  thumbnails: {
    blur_data_url: () =>
      faker.helpers.arrayElement([
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      ]),
    created_at: () => faker.date.past({ years: 1 }).toISOString(),
    deleted_at: nullable(() => null),
    etag: () => faker.string.alphanumeric(32),
    height: () => faker.helpers.arrayElement([720, 1080, 480]),
    id: primaryKey(faker.string.uuid),
    path: () =>
      faker.system
        .filePath()
        .replace(/^.*[\\/]/, '')
        .replace(/\.[^.]*$/, '.jpg'),
    updated_at: () => new Date().toISOString(),
    width: () => faker.helpers.arrayElement([1280, 1920, 854]),
  },

  // Videos table
  videos: {
    created_at: () => faker.date.past({ years: 1 }).toISOString(),
    deleted_at: nullable(() =>
      faker.helpers.arrayElement([
        null,
        null,
        null,
        null,
        faker.date.recent({ days: 7 }).toISOString(),
      ]),
    ),
    duration: () =>
      faker.helpers.arrayElement([
        'PT5M30S',
        'PT10M15S',
        'PT15M45S',
        'PT20M30S',
        'PT8M22S',
        'PT12M18S',
      ]),
    id: primaryKey(faker.string.uuid),
    platform: nullable(() => null),
    published_at: () => faker.date.past({ years: 1 }).toISOString(),
    status: () =>
      faker.helpers.arrayElement([
        'PUBLISHED',
        'LIVE',
        'ENDED',
        'UPCOMING',
      ] as const),
    talent_id: () => faker.string.uuid(),
    thumbnail_id: () => faker.string.uuid(),
    title: () =>
      faker.helpers.arrayElement([
        `${faker.word.adjective()} ${faker.word.noun()} Video`,
        `${faker.company.buzzAdjective()} ${faker.company.buzzNoun()}`,
        `How to ${faker.hacker.verb()} ${faker.hacker.noun()}`,
        `${faker.number.int({ max: 100, min: 1 })} Ways to ${faker.hacker.verb()}`,
        `${faker.word.adjective()} Tutorial #${faker.number.int({ max: 100, min: 1 })}`,
      ]),
    updated_at: () => new Date().toISOString(),
    visible: () => faker.helpers.arrayElement([true, true, true, false]),
  },

  // YouTube Channels table
  youtube_channels: {
    id: primaryKey(faker.string.uuid),
    name: () =>
      faker.helpers.arrayElement([
        `${faker.word.adjective()} ${faker.word.noun()} Channel`,
        `${faker.company.buzzAdjective()} ${faker.company.buzzNoun()}`,
        `${faker.person.firstName()}'s Channel`,
      ]),
    talent_id: () => faker.string.uuid(),
    youtube_channel_id: () => `UC${faker.string.alphanumeric(22)}`,
    youtube_handle: () => `@${faker.internet.username().toLowerCase()}`,
  },

  // YouTube Videos relation table
  youtube_videos: {
    video_id: primaryKey(() => faker.string.uuid()),
    youtube_channel_id: () => faker.string.uuid(),
    youtube_video_id: () => `YT_${faker.string.alphanumeric(11)}`,
  },
})

/**
 * Seed the database with initial data
 * This creates consistent test data with proper relationships
 */
export function seedDatabase() {
  // Create talents using bracket notation for TypeScript strict mode
  const talents = Array.from({ length: 4 }, (_, idx) =>
    db['talents'].create({
      id: `750e8400-e29b-41d4-a716-44665544000${idx + 1}`,
    }),
  )

  // Create thumbnails
  const thumbnails = Array.from({ length: 10 }, (_, idx) =>
    db['thumbnails'].create({
      id: `650e8400-e29b-41d4-a716-44665544000${idx + 1}`,
    }),
  )

  // Create YouTube channels linked to talents
  const channels = talents.map((talent, idx) =>
    db['youtube_channels'].create({
      id: `550e8400-e29b-41d4-a716-44665544000${idx + 1}`,
      talent_id: talent['id'],
      youtube_channel_id: `UCtest${idx + 1}23`,
    }),
  )

  // Create videos linked to talents and thumbnails
  const videos = Array.from({ length: 10 }, (_, idx) =>
    db['videos'].create({
      id: `750e8400-e29b-41d4-a716-44665544000${idx + 1}`,
      talent_id: talents[idx % talents.length]?.['id'] ?? '',
      thumbnail_id: thumbnails[idx % thumbnails.length]?.['id'] ?? '',
    }),
  )

  // Create YouTube video relations
  videos.forEach((video, idx) => {
    db['youtube_videos'].create({
      video_id: video['id'],
      youtube_channel_id: channels[idx % channels.length]?.['id'] ?? '',
    })
  })

  // Create terms
  Array.from({ length: 3 }, (_, idx) =>
    db['terms'].create({
      id: `850e8400-e29b-41d4-a716-44665544000${idx + 1}`,
    }),
  )

  // Create announcements
  Array.from({ length: 2 }, (_, idx) =>
    db['announcements'].create({
      enabled: true,
      id: `850e8400-e29b-41d4-a716-44665544000${idx + 1}`,
    }),
  )

  console.log('✅ Mock database seeded with test data')
}

// Seed the database on module load
seedDatabase()
