import type { default as DefaultDatabase } from '@shinju-date/database'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { cookies } from 'next/headers'

const isProd = process.env['NODE_ENV'] === 'production'

class CookieStorage
  implements Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>
{
  #cookieStore: Awaited<ReturnType<typeof cookies>>

  constructor({
    cookieStore,
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
      secure: isProd,
    })
  }

  setItem(key: string, item: string): void {
    this.#cookieStore.set(key, item, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'strict',
      secure: isProd,
    })
  }
}

export type TypedSupabaseClient<Database = DefaultDatabase> =
  SupabaseClient<Database>

export function createSupabaseClient<Database = DefaultDatabase>(
  url: string,
  key: string,
  options?: NonNullable<Parameters<typeof createClient<Database>>[2]> & {
    cookieStore?: Awaited<ReturnType<typeof cookies>>
  },
): SupabaseClient<Database>
export function createSupabaseClient<Database = DefaultDatabase>(
  key: string,
  options?: NonNullable<Parameters<typeof createClient<Database>>[2]> & {
    cookieStore?: Awaited<ReturnType<typeof cookies>>
  },
): SupabaseClient<Database>
export function createSupabaseClient<Database = DefaultDatabase>(
  options: NonNullable<Parameters<typeof createClient<Database>>[2]> & {
    cookieStore?: Awaited<ReturnType<typeof cookies>>
  },
): SupabaseClient<Database>
export function createSupabaseClient<
  Database = DefaultDatabase,
>(): SupabaseClient<Database>
export function createSupabaseClient<Database = DefaultDatabase>(
  urlOrKeyOrOptions?:
    | string
    | (NonNullable<Parameters<typeof createClient<Database>>[2]> & {
        cookieStore?: Awaited<ReturnType<typeof cookies>>
      }),
  keyOrOptions?:
    | string
    | (NonNullable<Parameters<typeof createClient<Database>>[2]> & {
        cookieStore?: Awaited<ReturnType<typeof cookies>>
      }),
  options?: NonNullable<Parameters<typeof createClient<Database>>[2]> & {
    cookieStore?: Awaited<ReturnType<typeof cookies>>
  },
): SupabaseClient<Database> {
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

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      flowType: 'pkce',
      storage:
        cookieStore &&
        new CookieStorage({
          cookieStore,
        }),
      ...authOptions,
    },
    ...clientOptions,
  })
}

export const supabaseClient = createSupabaseClient()
