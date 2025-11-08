import type { default as DefaultDatabase } from '@shinju-date/database'
import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with service role key for privileged operations.
 * This client has elevated permissions and should only be used in secure server contexts.
 */
function createSupabaseAdminClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    throw new TypeError('Supabase URL and service role key are required.')
  }

  return createClient<DefaultDatabase>(url, key)
}

export const supabaseClient = createSupabaseAdminClient()
