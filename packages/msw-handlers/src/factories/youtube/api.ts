import { faker } from '@faker-js/faker'

/**
 * Factory for generating YouTube API Channel response
 */
export function createYoutubeAPIChannelFactory(
  overrides: { id?: string; uploadsPlaylistId?: string } = {},
) {
  const channelId = overrides.id || `UC${faker.string.alphanumeric(22)}`
  const uploadsPlaylistId =
    overrides.uploadsPlaylistId || `UU${channelId.substring(2)}_uploads`

  return {
    contentDetails: {
      relatedPlaylists: {
        uploads: uploadsPlaylistId,
      },
    },
    id: channelId,
  }
}

/**
 * Factory for generating YouTube API PlaylistItem response
 */
export function createYoutubeAPIPlaylistItemFactory(
  overrides: { id?: string; videoId?: string } = {},
) {
  return {
    contentDetails: {
      videoId: overrides.videoId || `YT_${faker.string.alphanumeric(11)}`,
    },
    id: overrides.id || `playlist_item_${faker.string.alphanumeric(8)}`,
  }
}

/**
 * Factory for generating YouTube API Video response
 */
export function createYoutubeAPIVideoFactory(
  overrides: {
    description?: string
    duration?: string
    id?: string
    publishedAt?: string
    title?: string
  } = {},
) {
  return {
    contentDetails: {
      duration:
        overrides.duration ||
        faker.helpers.arrayElement([
          'PT5M30S',
          'PT10M15S',
          'PT15M45S',
          'PT20M30S',
          'PT8M22S',
        ]),
    },
    id: overrides.id || `YT_${faker.string.alphanumeric(11)}`,
    snippet: {
      description: overrides.description || faker.lorem.paragraph(),
      publishedAt:
        overrides.publishedAt || faker.date.past({ years: 1 }).toISOString(),
      title:
        overrides.title ||
        faker.helpers.arrayElement([
          `${faker.word.adjective()} ${faker.word.noun()} Video`,
          `How to ${faker.hacker.verb()} ${faker.hacker.noun()}`,
          `${faker.number.int({ max: 100, min: 1 })} ${faker.word.noun()} Tips`,
        ]),
    },
  }
}

export function createManyYoutubeAPIChannels(
  count: number,
  overrides: Parameters<typeof createYoutubeAPIChannelFactory>[0] = {},
) {
  return Array.from({ length: count }, () =>
    createYoutubeAPIChannelFactory(overrides),
  )
}

export function createManyYoutubeAPIPlaylistItems(
  count: number,
  overrides: Parameters<typeof createYoutubeAPIPlaylistItemFactory>[0] = {},
) {
  return Array.from({ length: count }, () =>
    createYoutubeAPIPlaylistItemFactory(overrides),
  )
}

export function createManyYoutubeAPIVideos(
  count: number,
  overrides: Parameters<typeof createYoutubeAPIVideoFactory>[0] = {},
) {
  return Array.from({ length: count }, () =>
    createYoutubeAPIVideoFactory(overrides),
  )
}
