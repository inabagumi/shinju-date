import type { default as DefaultDatabase } from '@shinju-date/database'
import { createClient } from '@supabase/supabase-js'

/**
 * A simple Supabase client for use in Client Components.
 * This client does not handle authentication and should only be used
 * for public operations like accessing public storage URLs.
 */
function createPublicClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  return createClient<DefaultDatabase>(url, key)
}

export const supabaseClient = createPublicClient()
