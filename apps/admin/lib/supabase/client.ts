import { type Database } from '@shinju-date/schema'
import {
  type Session,
  type SupabaseClient,
  type SupportedStorage,
  createClient
} from '@supabase/supabase-js'

export const CURRENT_SESSION_KEY = 'currentSession'

export class SupabaseAuthStorage implements SupportedStorage {
  #currentSession?: Session

  constructor(session?: Session) {
    this.#currentSession = session
  }

  getItem(key: string): string | null {
    return key === CURRENT_SESSION_KEY && this.#currentSession
      ? JSON.stringify(this.#currentSession)
      : null
  }

  removeItem(key: string): void {
    if (key === CURRENT_SESSION_KEY) {
      this.#currentSession = undefined
    }
  }

  setItem(key: string, value: string): void {
    if (key === CURRENT_SESSION_KEY) {
      this.#currentSession = JSON.parse(value) as Session
    }
  }
}

export const defaultStorage = new SupabaseAuthStorage()

export type CreateSupabaseClientOptions = {
  session?: Session
}

export function createSupabaseClient({
  session
}: CreateSupabaseClientOptions = {}): SupabaseClient<Database> {
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
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: new SupabaseAuthStorage(session),
        storageKey: CURRENT_SESSION_KEY
      },
      global: {
        fetch(input, init): Promise<Response> {
          return fetch(input, { ...init, cache: 'no-store' })
        }
      }
    }
  )
}
