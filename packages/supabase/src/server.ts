import { createServerClient } from '@supabase/ssr'
import { type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers.js'
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

  let cookieStore: ReturnType<typeof cookies> | undefined

  try {
    cookieStore = cookies()
  } catch {
    // empty
  }

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict',
      secure: true
    },
    cookies: {
      get(name) {
        return cookieStore?.get(name)?.value
      },
      remove(name, options) {
        cookieStore?.delete({
          name,
          ...options
        })
      },
      set(name, value, options) {
        cookieStore?.set(name, value, options)
      }
    }
  })
}

export { type Database }
export { type PostgrestError } from '@supabase/supabase-js'
