export { supabaseHandlers } from './handlers/supabase.js'
export { upstashHandlers } from './handlers/upstash.js'

import { supabaseHandlers } from './handlers/supabase.js'
import { upstashHandlers } from './handlers/upstash.js'

/**
 * All mock handlers for browser environments
 * Use this in your app's MSW setup for development
 */
export const allHandlers = [...supabaseHandlers, ...upstashHandlers]

/**
 * Default export for convenience
 */
export default allHandlers
