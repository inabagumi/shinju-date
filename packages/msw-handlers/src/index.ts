import { googleFontsHandlers } from './handlers/google-fonts.js'
import { supabaseHandlers } from './handlers/supabase.js'
import { upstashHandlers } from './handlers/upstash.js'

/**
 * All mock handlers for browser environments
 * Use this in your app's MSW setup for development
 */
export const allHandlers = [
  ...googleFontsHandlers,
  ...supabaseHandlers,
  ...upstashHandlers,
]

export { googleFontsHandlers, supabaseHandlers, upstashHandlers }

/**
 * Default export for convenience
 */
export default allHandlers
