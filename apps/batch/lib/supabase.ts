import type { default as DefaultDatabase } from '@shinju-date/database'
import retryableFetch from '@shinju-date/retryable-fetch'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type TypedSupabaseClient<Database = DefaultDatabase> =
  SupabaseClient<Database>

export function createSupabaseClient<Database = DefaultDatabase>(
  url: string | undefined = process.env['NEXT_PUBLIC_SUPABASE_URL'],
  key: string | undefined = process.env['SUPABASE_SERVICE_ROLE_KEY'],
  options?: NonNullable<Parameters<typeof createClient<Database>>[2]>,
): SupabaseClient<Database> {
  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  return createClient<Database>(url, key, {
    ...options,
    global: {
      ...options?.global,
      fetch: options?.global?.fetch ?? retryableFetch,
    },
  })
}

export const supabaseClient = createSupabaseClient()
