import type Database from '@shinju-date/database'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase environment variables are not set')
}

export const supabaseClient = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
)
