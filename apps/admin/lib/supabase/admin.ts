import type { default as DefaultDatabase } from '@shinju-date/database'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with service role key for privileged operations.
 * This client has elevated permissions and should only be used in secure server contexts.
 */
export function createSupabaseAdminClient<Database = DefaultDatabase>(
  url = process.env['NEXT_PUBLIC_SUPABASE_URL'],
  key = process.env['SUPABASE_SERVICE_ROLE_KEY'],
): SupabaseClient<Database> {
  if (!url || !key) {
    throw new TypeError('Supabase URL and service role key are required.')
  }

  return createClient<Database>(url, key)
}
