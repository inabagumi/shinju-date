import type { default as Database } from '@shinju-date/database'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

const isProd = process.env['NODE_ENV'] === 'production'

/**
 * Creates a Supabase client for use in React Server Components.
 * This function properly handles cookies for authentication and caching.
 *
 * @param cookieStore - The cookie store from `next/headers`
 * @returns A Supabase client instance
 */
export function createServerComponentClient(
  cookieStore: ReadonlyRequestCookies,
): SupabaseClient<Database> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: 'strict',
              secure: isProd,
            })
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
