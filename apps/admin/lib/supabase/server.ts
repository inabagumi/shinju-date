import { type Database } from '@shinju-date/schema'
import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import fetch from '@/lib/fetch'

export function createSupabaseClient(): SupabaseClient<Database> {
  const cookieStore = cookies()

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem(key) {
            const cookie = cookieStore.get(key)

            return cookie ? cookie.value : null
          },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          setItem() {},
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          removeItem() {}
        }
      },
      global: {
        fetch
      }
    }
  )
}
