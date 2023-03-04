import { type Database } from '@shinju-date/schema'
import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { type NextRequest, type NextResponse } from 'next/server'

export function createSupabaseClient(
  request: NextRequest,
  response: NextResponse
): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem(key) {
            const cookie = request.cookies.get(key)

            return cookie ? cookie.value : null
          },
          setItem(key, item) {
            response.cookies.set(key, item)
          },
          removeItem(key) {
            response.cookies.delete(key)
          }
        }
      },
      global: {
        fetch
      }
    }
  )
}
