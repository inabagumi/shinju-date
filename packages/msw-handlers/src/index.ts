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
 * - Zod schema validation
 *
 * Example:
 * ```ts
 * import { videos, seedCollections } from '@shinju-date/msw-handlers'
 *
 * // Initialize collections
 * await seedCollections()
 *
 * // Find videos
 * const allVideos = await videos.findMany((q) =>
 *   q.where({ visible: true })
 * )
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
