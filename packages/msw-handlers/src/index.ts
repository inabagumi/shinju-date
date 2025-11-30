import { googleFontsHandlers } from './handlers/google-fonts.js'
import { resendHandlers } from './handlers/resend.js'
import { supabaseHandlers } from './handlers/supabase.js'
import { upstashHandlers } from './handlers/upstash.js'
import { youtubeHandlers } from './handlers/youtube.js'

/**
 * All mock handlers for browser environments
 * Use this in your app's MSW setup for development
 */
export const allHandlers = [
  ...googleFontsHandlers,
  ...resendHandlers,
  ...supabaseHandlers,
  ...upstashHandlers,
  ...youtubeHandlers,
]

export {
  googleFontsHandlers,
  resendHandlers,
  supabaseHandlers,
  upstashHandlers,
  youtubeHandlers,
}

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
  seedCollections,
  talents,
  terms,
  thumbnails,
  videos,
  youtubeChannels,
  youtubeVideos,
} from './collections.js'

/**
 * Default export for convenience
 */
export default allHandlers
