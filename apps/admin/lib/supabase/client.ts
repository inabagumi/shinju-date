import { type Database } from '@shinju-date/schema'
import {
  type Session,
  type SupabaseClient,
  type SupportedStorage,
  createClient
} from '@supabase/supabase-js'

export const CURRENT_SESSION_KEY = 'currentSession'

export class SupabaseAuthStorage implements SupportedStorage {
  #apiURL = '/api/sessions/me'
  #currentSession: Session | undefined
  #defaultFetchOptions: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    mode: 'same-origin'
  }

  constructor(defaultSession?: Session) {
    this.#currentSession = defaultSession
  }

  async getItem(key: string): Promise<string | null> {
    if (key !== CURRENT_SESSION_KEY) {
      return null
    }

    if (this.#currentSession) {
      return JSON.stringify(this.#currentSession)
    } else if ('window' in globalThis) {
      const response = await fetch(this.#apiURL, {
        ...this.#defaultFetchOptions,
        method: 'GET'
      })

      if (!response.ok) {
        return null
      }

      return response.text()
    }

    return null
  }

  async removeItem(key: string): Promise<void> {
    if (key !== CURRENT_SESSION_KEY) {
      return
    }

    if (this.#currentSession) {
      this.#currentSession = undefined
    } else if ('window' in globalThis) {
      await fetch(this.#apiURL, {
        ...this.#defaultFetchOptions,
        method: 'DELETE'
      })
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (key !== CURRENT_SESSION_KEY) {
      return
    }

    const maybeSession = JSON.parse(value) as unknown

    if (
      maybeSession === null ||
      typeof maybeSession !== 'object' ||
      !('access_token' in maybeSession) ||
      typeof maybeSession.access_token !== 'string' ||
      !('refresh_token' in maybeSession) ||
      typeof maybeSession.refresh_token !== 'string'
    ) {
      return
    }

    if (this.#currentSession) {
      this.#currentSession = undefined
    }

    if ('window' in globalThis) {
      if (this.#currentSession) {
        this.#currentSession = undefined
      }

      await fetch(this.#apiURL, {
        ...this.#defaultFetchOptions,
        body: JSON.stringify({
          access_token: maybeSession.access_token,
          refresh_token: maybeSession.refresh_token
        }),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        },
        method: 'PUT'
      })
    } else {
      this.#currentSession = maybeSession as Session
    }
  }
}

export type CreateSupabaseClientOptions = {
  session?: Session
}

export function createSupabaseClient({
  session
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
        storage: new SupabaseAuthStorage(session),
        storageKey: CURRENT_SESSION_KEY
      }
    }
  )
}
