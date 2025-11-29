import { faker } from '@faker-js/faker'

/**
 * Factory for generating mock YouTube Channel relation data
 */
export function createYoutubeChannelFactory(
  overrides: {
    talent_id?: string
    youtube_channel_id?: string
    youtube_handle?: string
  } = {},
) {
  return {
    talent_id: faker.string.uuid(),
    youtube_channel_id: `UC${faker.string.alphanumeric(22)}`,
    youtube_handle: `@${faker.internet.username().toLowerCase()}`,
    ...overrides,
  }
}

/**
 * Factory for generating mock YouTube Video relation data
 */
export function createYoutubeVideoFactory(
  overrides: {
    video_id?: string
    youtube_channel_id?: string
    youtube_video_id?: string
  } = {},
) {
  return {
    video_id: faker.string.uuid(),
    youtube_channel_id: faker.string.uuid(),
    youtube_video_id: `YT_${faker.string.alphanumeric(11)}`,
    ...overrides,
  }
}

export function createManyYoutubeChannels(
  count: number,
  overrides: Parameters<typeof createYoutubeChannelFactory>[0] = {},
) {
  return Array.from({ length: count }, () =>
    createYoutubeChannelFactory(overrides),
  )
}

export function createManyYoutubeVideos(
  count: number,
  overrides: Parameters<typeof createYoutubeVideoFactory>[0] = {},
) {
  return Array.from({ length: count }, () =>
    createYoutubeVideoFactory(overrides),
  )
}
