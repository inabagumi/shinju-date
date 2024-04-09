import { type default as DefaultDatabase } from '@shinju-date/database'
import {
  type SupabaseClient,
  type SupabaseClientOptions,
  createClient
} from '@supabase/supabase-js'

export type TypedSupabaseClient<
  Database = DefaultDatabase,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
> = SupabaseClient<Database, SchemaName>

export function createSupabaseClient<
  Database = DefaultDatabase,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>(
  url: string | undefined = process.env['NEXT_PUBLIC_SUPABASE_URL'],
  key: string | undefined = process.env['SUPABASE_SERVICE_ROLE_KEY'],
  options?: SupabaseClientOptions<SchemaName> | undefined
): SupabaseClient<Database, SchemaName> {
  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  return createClient<Database, SchemaName>(url, key, options)
}

export const supabaseClient = createSupabaseClient()
