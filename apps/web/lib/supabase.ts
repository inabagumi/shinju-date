import type { default as Database } from '@shinju-date/database'
import retryableFetch from '@shinju-date/retryable-fetch'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { publicEnv, serverEnv } from '@/lib/env'

function createSupabaseClient(key: string): SupabaseClient<Database> {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key, {
    global: {
      fetch(requestInfo, requestInit) {
        return retryableFetch(requestInfo, {
          ...requestInit,
        })
      },
    },
  })
}

/** The client with the anonymous key, which RLS restricts. */
export const supabaseClient = createSupabaseClient(
  publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

let supabaseAdminClient: SupabaseClient<Database> | undefined

/**
 * The client with the service role key, which bypasses RLS. Use it only for
 * what the anonymous key cannot do, such as reading private storage.
 *
 * Created on first use and reused afterwards, so that importing this module
 * in the browser does not read the server-only key.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  supabaseAdminClient ??= createSupabaseClient(
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  )

  return supabaseAdminClient
}
