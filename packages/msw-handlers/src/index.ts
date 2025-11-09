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
 * Default export for convenience
 */
export default allHandlers
