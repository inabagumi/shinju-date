import { googleFontsHandlers } from './handlers/google-fonts.js'
import { resendHandlers } from './handlers/resend.js'
import { supabaseHandlers } from './handlers/supabase/index.js'
import { twitchHandlers } from './handlers/twitch.js'
import { upstashHandlers } from './handlers/upstash/index.js'
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
 * The `@msw/data` collections of the mock database, which the Supabase mock
 * reads and writes. `seedCollections()` replaces their rows with the seed
 * data, which is the same for the same `now`:
 *
 * ```ts
 * import { seedCollections, videos } from '@shinju-date/msw-handlers'
 *
 * await seedCollections({ now: Temporal.Instant.from('2026-11-15T12:00:00Z') })
 *
 * const visibleVideos = videos.findMany((q) => q.where({ visible: true }))
 * ```
 */
export {
  announcements,
  ensureCollectionsSeeded,
  featureRequests,
  profileImages,
  type SeedCollectionsOptions,
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
  MOCK_DELETED_TALENT_ID,
  MOCK_RETIRED_TALENT_ID,
  MOCK_TALENT_IDS,
  MOCK_TALENT_WITHOUT_VIDEOS_ID,
} from './seeds/accounts.js'
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
