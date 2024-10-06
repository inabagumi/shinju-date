import {
  type SupabaseClient,
  type SupabaseClientOptions,
  createClient
} from '@supabase/supabase-js'
import type { default as DefaultDatabase } from '@shinju-date/database'
import type { cookies } from 'next/headers'

const isProd = process.env['NODE_ENV'] === 'production'

class CookieStorage
  implements Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>
{
  #cookieStore: Awaited<ReturnType<typeof cookies>>

  constructor({
    cookieStore
  }: {
    cookieStore: Awaited<ReturnType<typeof cookies>>
  }) {
    this.#cookieStore = cookieStore
  }

  getItem(key: string): string | null {
    return this.#cookieStore.get(key)?.value ?? null
  }

  removeItem(key: string): void {
    this.#cookieStore.delete({
      httpOnly: true,
      name: key,
      sameSite: 'strict',
      secure: isProd
    })
  }

  setItem(key: string, item: string): void {
    this.#cookieStore.set(key, item, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'strict',
      secure: isProd
    })
  }
}

export type TypedSupabaseClient<
  Database = DefaultDatabase,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
> = SupabaseClient<Database, SchemaName>

type ClientOptions<SchemaName> = SupabaseClientOptions<SchemaName> & {
  cookieStore?: Awaited<ReturnType<typeof cookies>>
}

export function createSupabaseClient<
  Database = DefaultDatabase,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>(
  url: string,
  key: string,
  options?: ClientOptions<SchemaName>
): SupabaseClient<Database, SchemaName>
export function createSupabaseClient<
  Database = DefaultDatabase,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>(
  key: string,
  options?: ClientOptions<SchemaName>
): SupabaseClient<Database, SchemaName>
export function createSupabaseClient<
  Database = DefaultDatabase,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>(
  options: ClientOptions<SchemaName> | undefined
): SupabaseClient<Database, SchemaName>
export function createSupabaseClient<
  Database = DefaultDatabase,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>(): SupabaseClient<Database, SchemaName>
export function createSupabaseClient<
  Database = DefaultDatabase,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>(
  urlOrKeyOrOptions?: string | ClientOptions<SchemaName>,
  keyOrOptions?: string | ClientOptions<SchemaName>,
  options?: ClientOptions<SchemaName>
): SupabaseClient<Database, SchemaName> {
  const key =
    typeof keyOrOptions === 'string'
      ? keyOrOptions
      : typeof urlOrKeyOrOptions === 'string'
        ? urlOrKeyOrOptions
        : process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  const url =
    typeof keyOrOptions === 'string' && typeof urlOrKeyOrOptions === 'string'
      ? urlOrKeyOrOptions
      : process.env['NEXT_PUBLIC_SUPABASE_URL']

  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  const {
    auth: authOptions,
    cookieStore,
    ...clientOptions
  } = options ??
  (typeof keyOrOptions !== 'undefined' && typeof keyOrOptions !== 'string'
    ? keyOrOptions
    : typeof urlOrKeyOrOptions !== 'undefined' &&
        typeof urlOrKeyOrOptions !== 'string'
      ? urlOrKeyOrOptions
      : {})

  return createClient<Database, SchemaName>(url, key, {
    auth: {
      autoRefreshToken: true,
      flowType: 'pkce',
      storage: cookieStore && new CookieStorage({ cookieStore }),
      ...authOptions
    },
    ...clientOptions
  })
}

export const supabaseClient = createSupabaseClient()
