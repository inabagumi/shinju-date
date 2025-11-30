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

export const supabaseClient = createSupabaseClient()
