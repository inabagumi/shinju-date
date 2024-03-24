import { createServerClient } from '@supabase/ssr'
import {
  type SupabaseClient,
  type SupabaseClientOptions
} from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server.js'
import { type Database as DefaultDatabase } from '../types/supabase.js'

type Options<SchemaName> = SupabaseClientOptions<SchemaName> & {
  request: NextRequest
}

export function createSupabaseClientWithResponse<
  Database = DefaultDatabase,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>(
  supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ??
    process.env['SUPABASE_URL'],
  supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ??
    process.env['SUPABASE_ANON_KEY'],
  { request, ...options }: Options<SchemaName>
): [client: SupabaseClient<Database, SchemaName>, response: NextResponse] {
  if (!supabaseUrl || !supabaseKey) {
    throw new TypeError('The supabase URL and supabase key are required.')
  }

  let response = NextResponse.next()

  return [
    createServerClient<Database, SchemaName>(supabaseUrl, supabaseKey, {
      ...options,
      cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: true
      },
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        remove(name, options) {
          request.cookies.set({
            ...options,
            name,
            value: ''
          })
          response = NextResponse.next({
            headers: request.headers
          })
          response.cookies.delete({
            ...options,
            name
          })
        },
        set(name, value, options) {
          request.cookies.set({
            ...options,
            name,
            value
          })
          response = NextResponse.next({
            headers: request.headers
          })
          response.cookies.set(name, value, options)
        }
      }
    }),
    response
  ]
}
