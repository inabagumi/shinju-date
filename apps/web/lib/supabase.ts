import type { default as Database } from '@shinju-date/database'
import retryableFetch from '@shinju-date/retryable-fetch'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createSupabaseClient(
  url = process.env['NEXT_PUBLIC_SUPABASE_URL'],
  key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
): SupabaseClient<Database> {
  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  return createClient<Database>(url, key, {
    global: {
      fetch(requestInfo, requestInit) {
        return retryableFetch(requestInfo, {
          ...requestInit,
        })
      },
    },
  })
}

// Lazy initialization - client is created at runtime, not at build time
let _supabaseClient: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabaseClient) {
    _supabaseClient = createSupabaseClient()
  }
  return _supabaseClient
}

// For backward compatibility - accessing this property creates the client on demand
export const supabaseClient = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = client[prop as keyof SupabaseClient<Database>]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
