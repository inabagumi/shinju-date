import { type Database } from '@shinju-date/schema'
import { createServerComponentSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import fetch from '@/lib/fetch'

export function createSupabaseClient(): SupabaseClient<Database> {
  return createServerComponentSupabaseClient<Database>({
    cookies,
    headers,
    options: {
      global: {
        fetch
      }
    }
  })
}
