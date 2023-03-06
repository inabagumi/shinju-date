import { type Database } from '@shinju-date/schema'
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/supabase-js'
import { type NextRequest, type NextResponse } from 'next/server'
import fetch from '@/lib/fetch'

export function createSupabaseClient(
  request: NextRequest,
  response: NextResponse
): SupabaseClient<Database> {
  return createMiddlewareSupabaseClient(
    {
      req: request,
      res: response
    },
    {
      options: {
        global: {
          fetch
        }
      }
    }
  )
}
