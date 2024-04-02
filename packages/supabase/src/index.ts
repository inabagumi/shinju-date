import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { type Database } from '../types/supabase.js'

export function createSupabaseClient(
  supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ??
    process.env['SUPABASE_URL'],
  supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ??
    process.env['SUPABASE_ANON_KEY']
): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseKey) {
    throw new TypeError('The supabase URL and supabase key are required.')
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}

export { type Database as DefaultDatabase }
export { type PostgrestError } from '@supabase/supabase-js'
export {
  type Tables,
  type TablesInsert,
  type TablesUpdate
} from '../types/supabase.js'
