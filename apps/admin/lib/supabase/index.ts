import type { default as DefaultDatabase } from '@shinju-date/database'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const isProd = process.env['NODE_ENV'] === 'production'

export type TypedSupabaseClient<Database = DefaultDatabase> =
  SupabaseClient<Database>

/**
 * Creates a Supabase client for use in Server Components and Server Actions.
 * This function properly handles cookies for authentication.
 */
export async function createSupabaseServerClient<
  Database = DefaultDatabase,
>(): Promise<SupabaseClient<Database>> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  const cookieStore = await cookies()

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
