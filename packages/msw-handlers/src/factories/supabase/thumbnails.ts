import { faker } from '@faker-js/faker'
import type { Tables } from '@shinju-date/database'

/**
 * Factory for generating mock Thumbnail data
 */
export function createThumbnailFactory(
  overrides: Partial<Tables<'thumbnails'>> = {},
): Tables<'thumbnails'> {
  const now = new Date().toISOString()

  // Generate a simple base64 encoded 1x1 pixel image
  const blurDataUrl = faker.helpers.arrayElement([
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  ])

  return {
    blur_data_url: blurDataUrl,
    created_at: faker.date.past({ years: 1 }).toISOString(),
    deleted_at: null,
    etag: faker.string.alphanumeric(32),
    height: faker.helpers.arrayElement([720, 1080, 480]),
    id: faker.string.uuid(),
    path: faker.system
      .filePath()
      .replace(/^.*[\\/]/, '')
      .replace(/\.[^.]*$/, '.jpg'),
    updated_at: now,
    width: faker.helpers.arrayElement([1280, 1920, 854]),
    ...overrides,
  }
}

export function createManyThumbnails(
  count: number,
  overrides: Partial<Tables<'thumbnails'>> = {},
): Tables<'thumbnails'>[] {
  return Array.from({ length: count }, () => createThumbnailFactory(overrides))
}
