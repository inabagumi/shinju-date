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
 * Export the @mswjs/data database for advanced usage
 *
 * The db provides:
 * - findMany/findFirst for querying data
 * - create/update/delete for CRUD operations
 * - Structured data with relationships
 *
 * Example:
 * ```ts
 * import { db } from '@shinju-date/msw-handlers'
 *
 * // Find videos
 * const videos = db.videos.findMany({
 *   where: { visible: { equals: true } }
 * })
 *
 * // Create a new talent
 * const talent = db.talents.create({ name: 'New Talent' })
 * ```
 */
export { db, seedDatabase } from './db.js'

/**
 * Default export for convenience
 */
export default allHandlers
