/**
 * Mock Data Factories using @faker-js/faker
 *
 * This module provides factory functions to generate realistic mock data
 * for MSW handlers. Using factories instead of hardcoded data provides:
 *
 * - Better maintainability: Update schemas in one place
 * - Type safety: Factories match database table types
 * - Realistic data: Faker generates diverse, realistic examples
 * - Flexibility: Easily override specific fields
 * - Testability: Generate consistent or random data as needed
 *
 * @example
 * // Generate a single video
 * import { createVideoFactory } from './factories'
 * const video = createVideoFactory({ title: 'My Video' })
 *
 * @example
 * // Generate multiple videos
 * import { createManyVideos } from './factories'
 * const videos = createManyVideos(10)
 *
 * @example
 * // Generate related data
 * import { createTalentFactory, createVideoFactory } from './factories'
 * const talent = createTalentFactory()
 * const video = createVideoFactory({ talent_id: talent.id })
 */

export {
  createAnnouncementFactory,
  createManyAnnouncements,
} from './supabase/announcements.js'
export {
  createChannelFactory,
  createManyChannels,
} from './supabase/channels.js'
export {
  createManyTalents,
  createTalentFactory,
} from './supabase/talents.js'
export { createManyTerms, createTermFactory } from './supabase/terms.js'
export {
  createManyThumbnails,
  createThumbnailFactory,
} from './supabase/thumbnails.js'
export { createManyVideos, createVideoFactory } from './supabase/videos.js'
export {
  createManyYoutubeChannels,
  createManyYoutubeVideos,
  createYoutubeChannelFactory,
  createYoutubeVideoFactory,
} from './supabase/youtube.js'

export {
  createCustomRedisData,
  createRedisDataFactory,
  createRedisSortedSetItem,
} from './upstash/redis-data.js'

export {
  createManyYoutubeAPIChannels,
  createManyYoutubeAPIPlaylistItems,
  createManyYoutubeAPIVideos,
  createYoutubeAPIChannelFactory,
  createYoutubeAPIPlaylistItemFactory,
  createYoutubeAPIVideoFactory,
} from './youtube/api.js'
