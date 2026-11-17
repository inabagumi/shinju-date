import { googleFontsHandlers } from './handlers/google-fonts.js'
import { resendHandlers } from './handlers/resend.js'
import { supabaseHandlers } from './handlers/supabase/index.js'
import { twitchHandlers } from './handlers/twitch.js'
import { upstashHandlers } from './handlers/upstash.js'
import { youtubeHandlers } from './handlers/youtube.js'

/**
 * All mock handlers
 * Pass them to `setupServer()` (Node.js) or `setupWorker()` (browser)
 */
export const allHandlers = [
  ...googleFontsHandlers,
  ...resendHandlers,
  ...supabaseHandlers,
  ...twitchHandlers,
  ...upstashHandlers,
  ...youtubeHandlers,
]

/**
 * Export the @msw/data collections for advanced usage
 *
 * Collections provide:
 * - findMany/findFirst for querying data
 * - create/createMany for generating data
 * - update/delete for CRUD operations
 * - Native relation traversal (e.g., video.talent, video.thumbnail)
 * - Zod schema validation
 *
 * Example:
 * ```ts
 * import { videos, seedCollections } from '@shinju-date/msw-handlers'
 *
 * // Initialize collections (automatically defines relations)
 * await seedCollections()
 *
 * // Find videos with relation traversal
 * const allVideos = await videos.findMany((q) =>
 *   q.where({ visible: true })
 * )
 * // Access related data directly
 * const firstVideo = allVideos[0]
 * console.log(firstVideo.talent.name)  // Native relation traversal
 *
 * // Create a new video
 * await videos.create({
 *   title: 'New Video',
 *   // ... other fields
 * })
 * ```
 */
export {
  announcements,
  defineCollectionRelations,
  ensureCollectionsSeeded,
  MOCK_DELETED_TALENT_ID,
  MOCK_RETIRED_TALENT_ID,
  MOCK_TALENT_IDS,
  MOCK_TALENT_WITHOUT_VIDEOS_ID,
  profileImages,
  seedCollections,
  talents,
  terms,
  thumbnails,
  twitchUsers,
  twitchVideos,
  videoBackfillJobs,
  videos,
  youtubeChannels,
  youtubeVideos,
} from './collections.js'
export {
  googleFontsHandlers,
  resendHandlers,
  supabaseHandlers,
  twitchHandlers,
  upstashHandlers,
  youtubeHandlers,
}

/**
 * Default export for convenience
 */
export default allHandlers
