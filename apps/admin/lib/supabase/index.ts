import { type Database } from '@shinju-date/schema'
import {
  type SupabaseClient,
  type SupportedStorage,
  createClient
} from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { redisClient as defaultRedisClient } from '@/lib/redis'

const ONE_MONTH = 60 * 60 * 24 * 30

export class SupabaseAuthStorage implements SupportedStorage {
  #client: Redis

  constructor(client: Redis) {
    this.#client = client
  }

  getItem(key: string): Promise<string | null> {
    return this.#client.get<string>(key)
  }

  async removeItem(key: string): Promise<void> {
    await this.#client.del(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.#client.set(key, value)
    await this.#client.expire(key, ONE_MONTH)
  }
}

export const defaultStorage = new SupabaseAuthStorage(defaultRedisClient)

type CreateSupabaseClientOptions = {
  sessionID: string
}

export function createSupabaseClient({
  sessionID
}: CreateSupabaseClientOptions): SupabaseClient<Database> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new TypeError(
      '`process.env.NEXT_PUBLIC_SUPABASE_URL` must be defined.'
    )
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new TypeError(
      '`process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` must be defined.'
    )
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: true,
        storage: defaultStorage,
        storageKey: `session:${sessionID}:token`
      },
      global: {
        fetch(input, init): Promise<Response> {
          return fetch(input, { ...init, cache: 'no-store' })
        }
      }
    }
  )
}
